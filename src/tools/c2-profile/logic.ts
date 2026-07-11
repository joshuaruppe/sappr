/**
 * Static linter for Cobalt Strike malleable C2 profiles. Parses out the key
 * indicators (sleep/jitter, User-Agent, staging, pipe name, GET/POST URIs, the
 * self-signed cert fields) and flags common OPSEC red flags: noisy sleep/jitter,
 * staging left on, a default User-Agent, default named-pipe patterns, and the
 * giveaway Cobalt Strike default certificate. Pure analysis and validation (the
 * same job as CS's own c2lint), entirely client-side, so the profile never leaves
 * the browser.
 */

import type { Finding } from "@/components/tool/findings";

export interface ProfileSummary {
  sleeptime: number | null;
  jitter: number | null;
  userAgent: string;
  hostStage: boolean | null;
  pipename: string;
  getUris: string[];
  postUris: string[];
  cert: Record<string, string>;
}

export interface ProfileLintResult {
  summary: ProfileSummary;
  findings: Finding[];
  error: string;
}

/** Named-pipe patterns shipped as Cobalt Strike defaults (heavily signatured). */
const DEFAULT_PIPES = [/^msagent_/i, /^MSSE-/i, /^status_/i, /^postex_/i, /^mojo\./i, /^ntsvcs/i];

function stripComments(s: string): string {
  // Drop whole-line `#` comments (a commented-out `set` must not be parsed).
  return s.replace(/(^|\n)[ \t]*#[^\n]*/g, "$1");
}

function setStr(text: string, key: string): string | null {
  const m = new RegExp(`set\\s+${key}\\s+"([^"]*)"`, "i").exec(text);
  return m ? m[1] : null;
}

function setNum(text: string, key: string): number | null {
  const v = setStr(text, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Body of a `name { ... }` block, brace-balanced, or null if absent. */
function blockBody(text: string, name: string): string | null {
  const start = new RegExp(`\\b${name}\\s*\\{`, "i").exec(text);
  if (!start) return null;
  const from = start.index + start[0].length;
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      if (depth === 0) return text.slice(from, i);
      depth--;
    }
  }
  return text.slice(from);
}

function urisIn(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /set\s+uri(?:_x86|_x64)?\s+"([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    for (const part of m[1].split(/\s+/)) {
      const u = part.trim();
      if (u && !seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    }
  }
  return out;
}

export function lintProfile(text: string): ProfileLintResult {
  const empty: ProfileSummary = {
    sleeptime: null,
    jitter: null,
    userAgent: "",
    hostStage: null,
    pipename: "",
    getUris: [],
    postUris: [],
    cert: {},
  };
  if (!text.trim()) return { summary: empty, findings: [], error: "" };

  const t = stripComments(text);

  const sleeptime = setNum(t, "sleeptime");
  const jitter = setNum(t, "jitter");
  const userAgent = setStr(t, "useragent") ?? "";
  const hostStageStr = setStr(t, "host_stage");
  const hostStage = hostStageStr === null ? null : /true/i.test(hostStageStr);
  const pipename = setStr(t, "pipename") ?? "";

  const getUris = urisIn(blockBody(t, "http-get") ?? "");
  const postUris = urisIn(blockBody(t, "http-post") ?? "");

  const cert: Record<string, string> = {};
  const certBody = blockBody(t, "https-certificate");
  if (certBody) {
    for (const k of ["C", "O", "OU", "CN", "L", "ST"]) {
      const v = setStr(certBody, k);
      if (v) cert[k] = v;
    }
  }

  const summary: ProfileSummary = {
    sleeptime,
    jitter,
    userAgent,
    hostStage,
    pipename,
    getUris,
    postUris,
    cert,
  };

  const findings: Finding[] = [];

  if (getUris.length === 0 && postUris.length === 0) {
    findings.push({
      severity: "info",
      message: "No http-get / http-post URIs found. Is this a complete malleable C2 profile?",
    });
  }
  if (sleeptime === 0) {
    findings.push({
      severity: "high",
      message: "sleeptime is 0 (interactive): Beacon calls back constantly, which is extremely noisy.",
    });
  } else if (sleeptime !== null && sleeptime < 5000) {
    findings.push({
      severity: "medium",
      message: `Low sleeptime (${sleeptime}ms): frequent check-ins are easy to spot. Consider a longer interval for real ops.`,
    });
  }
  if (jitter !== null && jitter < 15) {
    findings.push({
      severity: "medium",
      message: `Low jitter (${jitter}%): near-regular beacon intervals are a classic tell. 20-50% is more typical.`,
    });
  }
  if (hostStage === true) {
    findings.push({
      severity: "medium",
      message:
        "host_stage is true (staging enabled): the stager is served over the C2 channel and is heavily signatured. Prefer stageless payloads and set host_stage to false.",
    });
  }
  if (!userAgent) {
    findings.push({
      severity: "medium",
      message:
        "No custom User-Agent set: Beacon falls back to a default UA that products fingerprint. Set a believable one that blends with the environment.",
    });
  }
  if (pipename && DEFAULT_PIPES.some((re) => re.test(pipename))) {
    findings.push({
      severity: "medium",
      message: `pipename "${pipename}" matches a known Cobalt Strike default pattern. Default pipe names are signatured; use a custom one.`,
    });
  }
  if (Object.values(cert).some((v) => /cobalt/i.test(v))) {
    findings.push({
      severity: "high",
      message:
        "The https-certificate fields still contain the Cobalt Strike default self-signed value, an obvious IOC. Use a real certificate (e.g. Let's Encrypt) on the redirector.",
    });
  }

  findings.push({
    severity: "info",
    message:
      "Static lint only. Run Cobalt Strike's own c2lint against the profile before an engagement for full validation.",
  });

  return { summary, findings, error: "" };
}
