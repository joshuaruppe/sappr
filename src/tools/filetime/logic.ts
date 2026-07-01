/**
 * Convert a Windows FILETIME (64-bit count of 100-nanosecond intervals since
 * 1601-01-01 UTC) into a human date. Handles the AD "never" sentinels. Pure.
 */

// Milliseconds between the FILETIME epoch (1601-01-01) and the Unix epoch.
const EPOCH_DIFF_MS = 11644473600000n;

export interface FiletimeResult {
  raw: string;
  iso?: string;
  utc?: string;
  /** Set for sentinel values (0, max) that mean "never". */
  special?: string;
  error: string;
}

/** Parse a FILETIME (decimal or 0x-hex) into a date. */
export function parseFiletime(input: string): FiletimeResult {
  const s = input.trim().replace(/[,\s]/g, "");
  if (s === "") return { raw: "", error: "" };

  let ft: bigint;
  try {
    if (/^0x[0-9a-fA-F]+$/.test(s)) ft = BigInt(s);
    else if (/^\d+$/.test(s)) ft = BigInt(s);
    else return { raw: s, error: "Enter a FILETIME as a decimal or 0x-hex integer." };
  } catch {
    return { raw: s, error: "Not a valid integer." };
  }

  if (ft === 0n) return { raw: s, special: "0 — never / not set", error: "" };
  if (ft === 9223372036854775807n || ft === 18446744073709551615n) {
    return { raw: s, special: "max value — never expires", error: "" };
  }

  const unixMs = ft / 10000n - EPOCH_DIFF_MS;
  const ms = Number(unixMs);
  // Guard against dates JS Date can't represent (±100,000,000 days from epoch).
  if (!Number.isFinite(ms) || ms < -8.64e15 || ms > 8.64e15) {
    return { raw: s, error: "Outside the representable date range." };
  }
  const d = new Date(ms);
  return { raw: s, iso: d.toISOString(), utc: d.toUTCString(), error: "" };
}
