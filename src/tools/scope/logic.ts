/**
 * Scope / target-list cleanup. Paste a messy engagement scope - a mix of single
 * IPs, CIDRs, hyphen ranges (full or nmap-style short), IPs with ports, URLs,
 * IPv6 and hostnames, with dupes and surrounding junk - and get back a clean,
 * deduped result in the form you need: every IPv4 host one-per-line (for
 * `nmap -iL`), the minimal set of collapsed CIDRs, or a single nmap-ready target
 * string. IPv4 is modeled as merged integer intervals, so a /8 doesn't blow up
 * memory and CIDR aggregation is exact. Nothing is silently dropped - unparsed
 * tokens are surfaced so you always see what got skipped. Entirely client-side.
 */

import type { Finding } from "@/components/tool/findings";

export type ScopeMode = "expand" | "collapse" | "targets";

export interface ScopeStats {
  /** Total unique IPv4 addresses in scope, before the expansion cap. */
  ipv4Hosts: number;
  /** Number of blocks after CIDR aggregation. */
  ipv4Cidrs: number;
  ipv6: number;
  hostnames: number;
  invalid: number;
  /** IP-shaped tokens that failed validation (bad octet/prefix) - likely typos. */
  malformed: number;
  /** Tokens dropped as exact duplicates of an already-seen entry. */
  duplicatesRemoved: number;
  /** True when ipv4Hosts exceeded EXPAND_CAP and `hosts` is truncated. */
  capped: boolean;
}

export interface ScopeResult {
  /** Expanded IPv4 hosts, sorted and deduped (truncated at EXPAND_CAP). */
  hosts: string[];
  /** Minimal aggregated IPv4 CIDRs. */
  cidrs: string[];
  /** One-line nmap target spec: CIDRs + IPv6 + hostnames, space-joined. */
  targets: string;
  /** Normalized, deduped IPv6 addresses/CIDRs (not expanded). */
  ipv6: string[];
  /** Deduped hostnames (not resolved - no backend). */
  hostnames: string[];
  /** Tokens that couldn't be classified, verbatim. */
  invalid: string[];
  /** IP-shaped tokens that failed validation (bad octet/prefix) - likely typos. */
  malformed: string[];
  stats: ScopeStats;
  findings: Finding[];
  error: string;
}

/** Cap on materializing individual hosts, so a /8 doesn't expand to 16M rows. */
export const EXPAND_CAP = 65536;

/** Inclusive interval of unsigned 32-bit IPv4 integers. */
interface Interval {
  start: number;
  end: number;
}

// ---- IPv4 -----------------------------------------------------------------

function ipv4ToInt(a: number, b: number, c: number, d: number): number {
  // Plain arithmetic (not `<<`) to stay in unsigned 0..2^32-1 space.
  return a * 16777216 + b * 65536 + c * 256 + d;
}

function intToIpv4(n: number): string {
  return [
    Math.floor(n / 16777216) % 256,
    Math.floor(n / 65536) % 256,
    Math.floor(n / 256) % 256,
    n % 256,
  ].join(".");
}

const OCTET = /^\d{1,3}$/;

function parseOctets(s: string): number[] | null {
  const parts = s.split(".");
  if (parts.length !== 4) return null;
  const out: number[] = [];
  for (const p of parts) {
    if (!OCTET.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    out.push(n);
  }
  return out;
}

function parseIpv4(s: string): number | null {
  const o = parseOctets(s);
  return o ? ipv4ToInt(o[0], o[1], o[2], o[3]) : null;
}

function cidrInterval(ip: number, prefix: number): Interval {
  if (prefix <= 0) return { start: 0, end: 4294967295 };
  const size = Math.pow(2, 32 - prefix);
  const network = Math.floor(ip / size) * size;
  return { start: network, end: network + size - 1 };
}

function mergeIntervals(ivs: Interval[]): Interval[] {
  if (ivs.length === 0) return [];
  const sorted = [...ivs].sort((a, b) => a.start - b.start);
  const out: Interval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (cur.start <= last.end + 1) {
      if (cur.end > last.end) last.end = cur.end;
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

/** Number of trailing zero bits (block-alignment) of a 0..2^32-1 integer. */
function trailingZeros(n: number): number {
  if (n === 0) return 32;
  let count = 0;
  while (n % 2 === 0) {
    count++;
    n /= 2;
  }
  return count;
}

/** Largest b with 2^b <= count (looped to avoid Math.log2 rounding at powers of two). */
function spanBits(count: number): number {
  let b = 0;
  while (Math.pow(2, b + 1) <= count) b++;
  return b;
}

/** Decompose an interval into the minimal list of aligned CIDR blocks. */
function intervalToCidrs(iv: Interval): string[] {
  const out: string[] = [];
  let start = iv.start;
  const end = iv.end;
  while (start <= end) {
    const bits = Math.min(trailingZeros(start), spanBits(end - start + 1));
    out.push(`${intToIpv4(start)}/${32 - bits}`);
    start += Math.pow(2, bits);
  }
  return out;
}

// ---- IPv6 -----------------------------------------------------------------

/** Parse an IPv6 address into 8 16-bit groups, or null. Handles `::` and a
 * trailing embedded IPv4 (e.g. `::ffff:1.2.3.4`); zone ids are dropped. */
function parseIpv6(input: string): number[] | null {
  let s = input;
  const pct = s.indexOf("%");
  if (pct >= 0) s = s.slice(0, pct);

  const parseChunk = (chunk: string): number[] | null => {
    if (chunk === "") return [];
    const parts = chunk.split(":");
    const res: number[] = [];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.includes(".")) {
        if (i !== parts.length - 1) return null; // embedded v4 only at the tail
        const o = parseOctets(p);
        if (!o) return null;
        res.push((o[0] << 8) | o[1], (o[2] << 8) | o[3]);
      } else {
        if (!/^[0-9a-fA-F]{1,4}$/.test(p)) return null;
        res.push(parseInt(p, 16));
      }
    }
    return res;
  };

  const halves = s.split("::");
  let groups: number[];
  if (halves.length > 2) return null;
  if (halves.length === 2) {
    const head = parseChunk(halves[0]);
    const tail = parseChunk(halves[1]);
    if (!head || !tail) return null;
    const missing = 8 - head.length - tail.length;
    if (missing < 1) return null; // `::` must stand in for >=1 zero group
    groups = [...head, ...new Array(missing).fill(0), ...tail];
  } else {
    const all = parseChunk(s);
    if (!all) return null;
    groups = all;
  }
  return groups.length === 8 ? groups : null;
}

/** Compress 8 groups to canonical form (longest zero-run → `::`). */
function normalizeIpv6(groups: number[]): string {
  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;
  for (let i = 0; i < 8; i++) {
    if (groups[i] === 0) {
      if (curStart < 0) {
        curStart = i;
        curLen = 1;
      } else {
        curLen++;
      }
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  }
  const hex = groups.map((g) => g.toString(16));
  if (bestLen < 2) return hex.join(":");
  return `${hex.slice(0, bestStart).join(":")}::${hex.slice(bestStart + bestLen).join(":")}`;
}

// ---- token classification -------------------------------------------------

type Classified =
  | { kind: "ipv4"; iv: Interval; norm: string }
  | { kind: "ipv6"; value: string; norm: string }
  | { kind: "hostname"; value: string; norm: string };

/** Pull the host out of a token: strip URL scheme/path/userinfo and a trailing
 * `:port`, unwrap `[ipv6]`. Leaves CIDRs and bare IPv6 intact. */
function hostFromToken(raw: string): string {
  // Strip wrapping quotes/parens/angles - but NOT `[`, which brackets IPv6.
  let t = raw.trim().replace(/^["'<(]+/, "").replace(/["'>).,;]+$/, "");
  const scheme = t.match(/^[a-z][a-z0-9+.-]*:\/\/(.*)$/i);
  if (scheme) {
    t = scheme[1].split(/[/?#]/)[0];
    const at = t.lastIndexOf("@");
    if (at >= 0) t = t.slice(at + 1);
  }
  const bracket = t.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracket) return bracket[1];
  // A single colon with a numeric tail is an ipv4/host port; multiple colons = ipv6.
  if ((t.match(/:/g) || []).length === 1 && /:\d+$/.test(t)) t = t.replace(/:\d+$/, "");
  return t;
}

const HOSTNAME =
  /^(?=.{1,253}$)(\*\.)?([a-zA-Z0-9_](?:[a-zA-Z0-9_-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

function classify(host: string): Classified | null {
  // IPv4 CIDR
  const cidr = host.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
  if (cidr) {
    const ip = parseIpv4(cidr[1]);
    const prefix = Number(cidr[2]);
    if (ip === null || prefix > 32) return null;
    const iv = cidrInterval(ip, prefix);
    return { kind: "ipv4", iv, norm: `${intToIpv4(iv.start)}/${prefix}` };
  }

  // IPv4 range, full: a.b.c.d-e.f.g.h
  const full = host.match(
    /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})-(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/,
  );
  if (full) {
    const a = parseIpv4(full[1]);
    const b = parseIpv4(full[2]);
    if (a === null || b === null) return null;
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    return { kind: "ipv4", iv: { start, end }, norm: `${intToIpv4(start)}-${intToIpv4(end)}` };
  }

  // IPv4 range, nmap-style short last octet: a.b.c.d-e
  const short = host.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)(\d{1,3})-(\d{1,3})$/);
  if (short) {
    const a = parseIpv4(short[1] + short[2]);
    const lo = Number(short[2]);
    const hi = Number(short[3]);
    if (a === null || hi > 255 || lo > hi) return null;
    return { kind: "ipv4", iv: { start: a, end: a + (hi - lo) }, norm: `${intToIpv4(a)}-${hi}` };
  }

  // Single IPv4
  const single = parseIpv4(host);
  if (single !== null) {
    return { kind: "ipv4", iv: { start: single, end: single }, norm: intToIpv4(single) };
  }

  // Salvage a leading IPv4 from a token mangled with stray separators - a
  // mistyped `IP::port`, an `IP/tcp:port`, and so on. A valid IPv6 address never
  // starts with a dotted quad (embedded IPv4 only ever sits in the low 32 bits),
  // so this can't steal a real IPv6 address; it just keeps a real host from
  // silently vanishing into the IPv6 bucket or the skip list.
  const lead = host.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})[:/]/);
  if (lead) {
    const ip = parseIpv4(lead[1]);
    if (ip !== null) return { kind: "ipv4", iv: { start: ip, end: ip }, norm: intToIpv4(ip) };
  }

  // IPv6, optionally with /prefix
  if (host.includes(":")) {
    const m = host.match(/^([^/]+)(?:\/(\d{1,3}))?$/);
    if (m) {
      const groups = parseIpv6(m[1]);
      const prefix = m[2] === undefined ? undefined : Number(m[2]);
      if (groups && (prefix === undefined || prefix <= 128)) {
        const norm = normalizeIpv6(groups) + (prefix === undefined ? "" : `/${prefix}`);
        return { kind: "ipv6", value: norm, norm };
      }
    }
    return null;
  }

  // Hostname (must be a dotted FQDN, so prose/CSV headers fall through to invalid)
  if (HOSTNAME.test(host)) {
    return { kind: "hostname", value: host, norm: host.toLowerCase() };
  }

  return null;
}

// ---- entry point ----------------------------------------------------------

/** A token shaped like an IPv4 address (or CIDR) that failed to validate - an
 * out-of-range octet or prefix. Almost always a typo, so it's surfaced with a
 * warning rather than lumped in with ordinary junk. Only consulted after normal
 * classification has already failed, so a valid address never reaches here. */
function looksLikeMalformedIp(host: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+(\/\d+)?$/.test(host);
}

const EMPTY: ScopeResult = {
  hosts: [],
  cidrs: [],
  targets: "",
  ipv6: [],
  hostnames: [],
  invalid: [],
  malformed: [],
  stats: {
    ipv4Hosts: 0,
    ipv4Cidrs: 0,
    ipv6: 0,
    hostnames: 0,
    invalid: 0,
    malformed: 0,
    duplicatesRemoved: 0,
    capped: false,
  },
  findings: [],
  error: "",
};

export function wrangleScope(input: string): ScopeResult {
  if (!input.trim()) return { ...EMPTY };

  const tokens = input.split(/[\s,;]+/).filter(Boolean);
  const intervals: Interval[] = [];
  const ipv6 = new Map<string, string>(); // norm -> display
  const hostnames = new Map<string, string>();
  const invalid: string[] = [];
  const malformed: string[] = [];
  const seen = new Set<string>();
  let duplicatesRemoved = 0;

  for (const tok of tokens) {
    const host = hostFromToken(tok);
    const c = host ? classify(host) : null;
    if (!c) {
      if (host && looksLikeMalformedIp(host)) {
        if (!malformed.includes(tok)) malformed.push(tok);
      } else {
        invalid.push(tok);
      }
      continue;
    }
    const key = `${c.kind}:${c.norm}`;
    if (seen.has(key)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(key);
    if (c.kind === "ipv4") intervals.push(c.iv);
    else if (c.kind === "ipv6") ipv6.set(c.norm, c.value);
    else hostnames.set(c.norm, c.value);
  }

  const merged = mergeIntervals(intervals);
  const ipv4Hosts = merged.reduce((n, iv) => n + (iv.end - iv.start + 1), 0);
  const cidrs = merged.flatMap(intervalToCidrs);

  const hosts: string[] = [];
  let capped = false;
  outer: for (const iv of merged) {
    for (let n = iv.start; n <= iv.end; n++) {
      if (hosts.length >= EXPAND_CAP) {
        capped = true;
        break outer;
      }
      hosts.push(intToIpv4(n));
    }
  }

  const ipv6List = [...ipv6.values()];
  const hostnameList = [...hostnames.values()];
  const targets = [...cidrs, ...ipv6List, ...hostnameList].join(" ");

  const findings: Finding[] = [];
  if (malformed.length) {
    const n = malformed.length;
    const shown = malformed.slice(0, 12).join(", ");
    const more = n > 12 ? `, and ${n - 12} more` : "";
    const phrase =
      n === 1
        ? "1 token looks like a mistyped IP address (out-of-range octet or prefix) and was"
        : `${n} tokens look like mistyped IP addresses (out-of-range octet or prefix) and were`;
    findings.push({
      severity: "medium",
      message: `${phrase} skipped. Double-check for a typo: ${shown}${more}.`,
    });
  }
  if (capped) {
    findings.push({
      severity: "medium",
      message: `IPv4 scope expands to ${ipv4Hosts.toLocaleString()} hosts; only the first ${EXPAND_CAP.toLocaleString()} are listed. Use Collapse (CIDRs) or narrow the scope.`,
    });
  }
  if (invalid.length) {
    findings.push({
      severity: "info",
      message: `${invalid.length} token${invalid.length === 1 ? "" : "s"} ${invalid.length === 1 ? "wasn't" : "weren't"} recognized as an IP, CIDR, range or hostname and ${invalid.length === 1 ? "was" : "were"} skipped.`,
    });
  }
  if (hostnameList.length) {
    findings.push({
      severity: "info",
      message: `${hostnameList.length} hostname${hostnameList.length === 1 ? "" : "s"} can't be expanded to IPs without DNS (no backend), passed through as-is.`,
    });
  }
  if (ipv6List.length) {
    findings.push({
      severity: "info",
      message: `${ipv6List.length} IPv6 entr${ipv6List.length === 1 ? "y is" : "ies are"} listed as-is; IPv6 ranges aren't expanded.`,
    });
  }

  return {
    hosts,
    cidrs,
    targets,
    ipv6: ipv6List,
    hostnames: hostnameList,
    invalid,
    malformed,
    stats: {
      ipv4Hosts,
      ipv4Cidrs: cidrs.length,
      ipv6: ipv6List.length,
      hostnames: hostnameList.length,
      invalid: invalid.length,
      malformed: malformed.length,
      duplicatesRemoved,
      capped,
    },
    findings,
    error: "",
  };
}
