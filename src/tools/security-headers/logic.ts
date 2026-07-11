/**
 * Analyze a pasted HTTP response-header block for security gaps: missing/weak
 * CSP, HSTS, framing, cookie flags, and info-leak headers. Pure - no DOM, no
 * network (paste headers from Burp/curl; live fetching is a 2.0-backend job).
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface HeaderEntry {
  name: string;
  value: string;
}

export interface HeadersResult {
  headers: HeaderEntry[];
  findings: Finding[];
  error: string;
}

const SEV_RANK: Record<Severity, number> = { high: 0, medium: 1, info: 2 };

function parseHeaderLines(input: string): HeaderEntry[] {
  const out: HeaderEntry[] = [];
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trim() === "") continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue; // status / request line
    const name = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!name || /\s/.test(name)) continue; // header names never contain whitespace
    out.push({ name, value });
  }
  return out;
}

/** Parse a CSP value into a directive → sources map. */
function parseCsp(csp: string): Record<string, string[]> {
  const dirs: Record<string, string[]> = {};
  for (const part of csp.split(";")) {
    const toks = part.trim().split(/\s+/).filter(Boolean);
    if (toks.length) dirs[toks[0].toLowerCase()] = toks.slice(1).map((s) => s.toLowerCase());
  }
  return dirs;
}

function analyzeCsp(csp: string, findings: Finding[]): void {
  const dirs = parseCsp(csp);
  const script = dirs["script-src"] ?? dirs["default-src"];

  if (!dirs["default-src"] && !dirs["script-src"]) {
    findings.push({ severity: "medium", message: "CSP defines neither default-src nor script-src." });
  }
  if (script) {
    if (script.includes("'unsafe-inline'")) {
      findings.push({
        severity: "high",
        message: "CSP allows 'unsafe-inline' scripts - defeats most of CSP's XSS protection.",
      });
    }
    if (script.includes("'unsafe-eval'")) {
      findings.push({ severity: "high", message: "CSP allows 'unsafe-eval'." });
    }
    if (script.some((s) => s === "*" || s === "http:" || s === "https:" || s === "data:")) {
      findings.push({
        severity: "high",
        message: "CSP script source allows a wildcard/scheme (*, https:, data:) - scripts can load from anywhere.",
      });
    }
  }
  if (!dirs["object-src"] && !dirs["default-src"]) {
    findings.push({ severity: "medium", message: "CSP has no object-src - plugin/embed injection vector." });
  }
  if (!dirs["base-uri"]) {
    findings.push({ severity: "medium", message: "CSP has no base-uri - <base> tag injection can hijack relative URLs." });
  }
  if (!dirs["frame-ancestors"]) {
    findings.push({ severity: "info", message: "CSP has no frame-ancestors - rely on X-Frame-Options for clickjacking defense." });
  }
}

function analyzeCookie(value: string, findings: Finding[]): void {
  const name = value.split("=")[0]?.trim() || "(cookie)";
  const attrs = value.toLowerCase();
  if (!/;\s*httponly/.test(attrs)) {
    findings.push({
      severity: "medium",
      message: `Cookie "${name}" is missing HttpOnly - readable by JavaScript (XSS can steal it).`,
    });
  }
  if (!/;\s*secure/.test(attrs)) {
    findings.push({
      severity: "medium",
      message: `Cookie "${name}" is missing Secure - may be sent over plain HTTP.`,
    });
  }
  if (!/;\s*samesite/.test(attrs)) {
    findings.push({
      severity: "info",
      message: `Cookie "${name}" has no SameSite attribute - CSRF exposure.`,
    });
  }
}

export function analyzeHeaders(input: string): HeadersResult {
  const empty: HeadersResult = { headers: [], findings: [], error: "" };
  if (input.trim() === "") return empty;

  const headers = parseHeaderLines(input);
  if (headers.length === 0) {
    return { ...empty, error: "No headers found. Paste a raw HTTP response header block." };
  }

  const byName = new Map<string, string[]>();
  for (const h of headers) {
    const k = h.name.toLowerCase();
    byName.set(k, [...(byName.get(k) ?? []), h.value]);
  }
  const get = (n: string) => byName.get(n)?.at(-1);
  const all = (n: string) => byName.get(n) ?? [];

  const findings: Finding[] = [];
  const csp = get("content-security-policy");

  if (!csp) {
    findings.push({
      severity: "high",
      message: "No Content-Security-Policy - no built-in defense against XSS / content injection.",
    });
  } else {
    analyzeCsp(csp, findings);
  }

  const hsts = get("strict-transport-security");
  if (!hsts) {
    findings.push({
      severity: "medium",
      message: "No Strict-Transport-Security (HSTS) - connections can be downgraded to HTTP.",
    });
  } else {
    const m = hsts.match(/max-age\s*=\s*(\d+)/i);
    if (m && Number(m[1]) < 15768000) {
      findings.push({ severity: "info", message: "HSTS max-age is under 6 months." });
    }
  }

  const xfo = get("x-frame-options");
  const frameAncestors = csp ? parseCsp(csp)["frame-ancestors"] : undefined;
  if (!xfo && !frameAncestors) {
    findings.push({
      severity: "medium",
      message: "No X-Frame-Options or CSP frame-ancestors - the page can be framed (clickjacking).",
    });
  }

  const xcto = get("x-content-type-options");
  if (!xcto || xcto.toLowerCase() !== "nosniff") {
    findings.push({ severity: "info", message: "X-Content-Type-Options should be 'nosniff'." });
  }
  if (!get("referrer-policy")) {
    findings.push({ severity: "info", message: "No Referrer-Policy - the full URL may leak in the Referer header." });
  }
  if (!get("permissions-policy")) {
    findings.push({ severity: "info", message: "No Permissions-Policy - browser features aren't restricted." });
  }

  for (const cookie of all("set-cookie")) analyzeCookie(cookie, findings);

  const server = get("server");
  if (server && /\d/.test(server)) {
    findings.push({ severity: "info", message: `Server header discloses software/version: ${server}` });
  }
  const poweredBy = get("x-powered-by");
  if (poweredBy) {
    findings.push({ severity: "info", message: `X-Powered-By discloses the stack: ${poweredBy}` });
  }
  for (const h of ["x-aspnet-version", "x-aspnetmvc-version"]) {
    const v = get(h);
    if (v) findings.push({ severity: "info", message: `${h} discloses a framework version: ${v}` });
  }

  findings.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  return { headers, findings, error: "" };
}
