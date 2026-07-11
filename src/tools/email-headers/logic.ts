/**
 * Parse raw email headers into a readable delivery trace: the Received hop chain
 * (from -> by, with per-hop delays), the SPF/DKIM/DMARC authentication results, and
 * the key envelope headers. Flags the classic phishing/spoofing tells: auth
 * failures and From vs Return-Path / Reply-To domain mismatches. Pure text parsing,
 * entirely client-side, so nothing you paste leaves the browser.
 */

import type { Finding } from "@/components/tool/findings";

export interface Hop {
  from: string;
  by: string;
  with: string;
  dateDisplay: string;
  epochMs: number | null;
  /** Seconds elapsed since the previous (older) hop, if both are dated. */
  delaySec: number | null;
}

export interface AuthResults {
  spf: string;
  dkim: string;
  dmarc: string;
  raw: string;
}

export interface EmailSummary {
  from: string;
  to: string;
  subject: string;
  date: string;
  messageId: string;
  returnPath: string;
  replyTo: string;
}

export interface EmailResult {
  summary: EmailSummary;
  hops: Hop[];
  auth: AuthResults;
  findings: Finding[];
  error: string;
}

/** Unfold RFC-5322 headers into ordered [name, value] pairs; stops at the body. */
function parseHeaders(text: string): [string, string][] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: [string, string][] = [];
  let cur: [string, string] | null = null;
  for (const line of lines) {
    if (line.trim() === "") {
      if (out.length) break; // blank line after headers = start of body
      continue;
    }
    if (/^[ \t]/.test(line) && cur) {
      cur[1] += " " + line.trim(); // folded continuation
      continue;
    }
    const m = /^([!-9;-~]+):[ \t]?(.*)$/.exec(line);
    if (m) {
      cur = [m[1], m[2]];
      out.push(cur);
    }
  }
  return out;
}

function first(pairs: [string, string][], name: string): string {
  const lc = name.toLowerCase();
  return pairs.find(([n]) => n.toLowerCase() === lc)?.[1].trim() ?? "";
}

function allValues(pairs: [string, string][], name: string): string[] {
  const lc = name.toLowerCase();
  return pairs.filter(([n]) => n.toLowerCase() === lc).map(([, v]) => v);
}

function domainOf(addr: string): string {
  const m = /@([A-Za-z0-9.-]+)/.exec(addr);
  return m ? m[1].toLowerCase().replace(/\.+$/, "") : "";
}

function parseReceived(value: string): Hop {
  const from = /\bfrom\s+([^\s;]+)/i.exec(value)?.[1] ?? "";
  const by = /\bby\s+([^\s;]+)/i.exec(value)?.[1] ?? "";
  const withProto = /\bwith\s+([^\s;()]+)/i.exec(value)?.[1] ?? "";
  const semi = value.lastIndexOf(";");
  const dateStr = semi >= 0 ? value.slice(semi + 1).trim() : "";
  const ms = dateStr ? Date.parse(dateStr) : NaN;
  return {
    from,
    by,
    with: withProto,
    dateDisplay: dateStr,
    epochMs: Number.isFinite(ms) ? ms : null,
    delaySec: null,
  };
}

const authTag = (raw: string, key: string): string =>
  new RegExp(`\\b${key}=(\\w+)`, "i").exec(raw)?.[1].toLowerCase() ?? "";

export function analyzeHeaders(text: string): EmailResult {
  const emptySummary: EmailSummary = {
    from: "",
    to: "",
    subject: "",
    date: "",
    messageId: "",
    returnPath: "",
    replyTo: "",
  };
  const emptyAuth: AuthResults = { spf: "", dkim: "", dmarc: "", raw: "" };
  if (!text.trim()) {
    return { summary: emptySummary, hops: [], auth: emptyAuth, findings: [], error: "" };
  }

  const pairs = parseHeaders(text);
  if (pairs.length === 0) {
    return {
      summary: emptySummary,
      hops: [],
      auth: emptyAuth,
      findings: [],
      error: "No headers found. Paste raw email headers (Received, From, Authentication-Results, ...).",
    };
  }

  const summary: EmailSummary = {
    from: first(pairs, "From"),
    to: first(pairs, "To"),
    subject: first(pairs, "Subject"),
    date: first(pairs, "Date"),
    messageId: first(pairs, "Message-ID"),
    returnPath: first(pairs, "Return-Path"),
    replyTo: first(pairs, "Reply-To"),
  };

  // Received headers are listed newest-first. Order them oldest -> newest, by
  // timestamp when every hop is dated, otherwise just reverse the header order.
  const received = allValues(pairs, "Received").map(parseReceived);
  const allDated = received.length > 0 && received.every((h) => h.epochMs !== null);
  const hops = allDated
    ? [...received].sort((a, b) => a.epochMs! - b.epochMs!)
    : [...received].reverse();
  for (let i = 1; i < hops.length; i++) {
    if (hops[i].epochMs !== null && hops[i - 1].epochMs !== null) {
      hops[i].delaySec = Math.round((hops[i].epochMs! - hops[i - 1].epochMs!) / 1000);
    }
  }

  const authRaw = first(pairs, "Authentication-Results");
  const recvSpf = first(pairs, "Received-SPF");
  const auth: AuthResults = {
    spf: authTag(authRaw, "spf") || /^(\w+)/.exec(recvSpf)?.[1].toLowerCase() || "",
    dkim: authTag(authRaw, "dkim"),
    dmarc: authTag(authRaw, "dmarc"),
    raw: authRaw,
  };

  const findings: Finding[] = [];
  if (auth.spf === "fail") {
    findings.push({
      severity: "high",
      message: "SPF fail: the sending server is not authorized by the From domain's SPF record.",
    });
  } else if (auth.spf === "softfail") {
    findings.push({
      severity: "medium",
      message: "SPF softfail: the sender is not clearly authorized by the From domain's SPF record.",
    });
  }
  if (auth.dkim === "fail") {
    findings.push({
      severity: "medium",
      message: "DKIM fail: the signature did not validate, so the content or signing domain may be forged.",
    });
  }
  if (auth.dmarc === "fail") {
    findings.push({
      severity: "high",
      message: "DMARC fail: the message failed the domain's alignment policy, a strong spoofing indicator.",
    });
  }

  const fromDom = domainOf(summary.from);
  const rpDom = domainOf(summary.returnPath);
  const rtDom = domainOf(summary.replyTo);
  if (fromDom && rpDom && fromDom !== rpDom) {
    findings.push({
      severity: "medium",
      message: `Return-Path domain (${rpDom}) differs from From (${fromDom}): common in bulk and spoofed mail.`,
    });
  }
  if (fromDom && rtDom && fromDom !== rtDom) {
    findings.push({
      severity: "medium",
      message: `Reply-To domain (${rtDom}) differs from From (${fromDom}): a classic phishing redirect, replies go elsewhere.`,
    });
  }
  if (!auth.spf && !auth.dkim && !auth.dmarc) {
    findings.push({
      severity: "info",
      message: "No SPF/DKIM/DMARC results in the headers; the receiving server may not have recorded them.",
    });
  }

  return { summary, hops, auth, findings, error: "" };
}
