/**
 * Convert a Windows FILETIME or AD Integer8 (LargeInteger) value. Both encode a
 * 64-bit count of 100-nanosecond intervals since 1601-01-01 UTC. A positive
 * value is an absolute time (file times, lastLogonTimestamp, pwdLastSet); a
 * negative value is an AD duration (maxPwdAge, lockoutDuration). Handles the
 * "never" sentinels. Pure — no DOM.
 */

const EPOCH_DIFF_MS = 11644473600000n; // 1601-01-01 → 1970-01-01
const NEVER_MAX = 9223372036854775807n; // 0x7FFFFFFFFFFFFFFF
const NEVER_MIN = -9223372036854775808n; // 0x8000000000000000
const UINT64_MAX = 18446744073709551615n; // 0xFFFFFFFFFFFFFFFF

export type WindowsTimeKind = "timestamp" | "duration" | "special" | null;

export interface WindowsTimeResult {
  raw: string;
  kind: WindowsTimeKind;
  iso?: string;
  utc?: string;
  duration?: string;
  special?: string;
  /** Which values / attributes this interpretation applies to. */
  note?: string;
  error: string;
}

function humanDuration(totalSeconds: bigint): string {
  if (totalSeconds === 0n) return "0 (immediate)";
  const d = totalSeconds / 86400n;
  const h = (totalSeconds % 86400n) / 3600n;
  const m = (totalSeconds % 3600n) / 60n;
  const sec = totalSeconds % 60n;
  const parts: string[] = [];
  const push = (n: bigint, unit: string) => {
    if (n) parts.push(`${n} ${unit}${n === 1n ? "" : "s"}`);
  };
  push(d, "day");
  push(h, "hour");
  push(m, "minute");
  push(sec, "second");
  return parts.join(", ");
}

/** Parse a FILETIME / Integer8 value (decimal, optionally negative, or 0x-hex). */
export function parseWindowsTime(input: string): WindowsTimeResult {
  const s = input.trim().replace(/[,\s]/g, "");
  if (s === "") return { raw: "", kind: null, error: "" };

  let v: bigint;
  try {
    if (/^-?0x[0-9a-fA-F]+$/.test(s)) {
      v = s.startsWith("-") ? -BigInt(s.slice(1)) : BigInt(s);
    } else if (/^-?\d+$/.test(s)) {
      v = BigInt(s);
    } else {
      return { raw: s, kind: null, error: "Enter a FILETIME / Integer8 value as a decimal or 0x-hex integer." };
    }
  } catch {
    return { raw: s, kind: null, error: "Not a valid integer." };
  }

  if (v === 0n) {
    return {
      raw: s,
      kind: "special",
      special: "0 — not set / never",
      note: "e.g. lastLogon = never logged on; maxPwdAge = 0 means passwords never expire.",
      error: "",
    };
  }
  if (v === NEVER_MAX || v === UINT64_MAX) {
    return {
      raw: s,
      kind: "special",
      special: "max value — never / never expires",
      note: "The 'never' sentinel, e.g. accountExpires / lockoutTime = never.",
      error: "",
    };
  }
  if (v === NEVER_MIN) {
    return {
      raw: s,
      kind: "special",
      special: "0x8000000000000000 — none / unset",
      note: "Minimum value; some duration attributes use it to mean 'not configured'.",
      error: "",
    };
  }

  if (v < 0n) {
    const seconds = -v / 10_000_000n;
    return {
      raw: s,
      kind: "duration",
      duration: humanDuration(seconds),
      note: "Negative Integer8 = a duration: maxPwdAge, minPwdAge, lockoutDuration, lockoutObservationWindow, forceLogoff.",
      error: "",
    };
  }

  const unixMs = v / 10000n - EPOCH_DIFF_MS;
  const ms = Number(unixMs);
  if (!Number.isFinite(ms) || ms < -8.64e15 || ms > 8.64e15) {
    return { raw: s, kind: null, error: "Outside the representable date range." };
  }
  const dt = new Date(ms);
  return {
    raw: s,
    kind: "timestamp",
    iso: dt.toISOString(),
    utc: dt.toUTCString(),
    note: "Positive value = an absolute time: file times, lastLogonTimestamp, pwdLastSet, accountExpires.",
    error: "",
  };
}
