/**
 * Cryptographically-secure random helpers.
 * Pure functions (apart from the CSPRNG) — no DOM/React, safe for tests.
 */

export type TokenFormat = "hex" | "base64" | "base64url" | "decimal";

/** Generate `n` cryptographically-random bytes (1..=1024). */
export function randomBytes(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("Byte length must be a positive integer.");
  }
  if (n > 1024) {
    throw new Error("Byte length must be 1024 or less.");
  }
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/** Format raw bytes as hex, base64, base64url or space-separated decimals. */
export function format(bytes: Uint8Array, fmt: TokenFormat): string {
  switch (fmt) {
    case "hex":
      return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    case "base64":
      return bytesToBase64(bytes);
    case "base64url":
      return bytesToBase64(bytes)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
    case "decimal":
      return Array.from(bytes, (b) => String(b)).join(" ");
    default:
      throw new Error("Unknown format.");
  }
}

/** Generate a token of `n` bytes rendered in the given format. */
export function randomToken(n: number, fmt: TokenFormat): string {
  return format(randomBytes(n), fmt);
}

/**
 * Uniform random integer in the inclusive range [min, max] using rejection
 * sampling over crypto bytes — no modulo bias.
 */
export function randomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error("Min and max must be integers.");
  }
  if (min > max) {
    throw new Error("Min must be less than or equal to max.");
  }
  const range = max - min + 1;
  if (range === 1) return min;
  // Cap at 2^48. Above this, the byte accumulation below (up to 7 bytes) would
  // exceed Number.MAX_SAFE_INTEGER (2^53) and lose the integer precision that
  // keeps the rejection sampling uniform.
  if (!Number.isSafeInteger(range) || range > 2 ** 48) {
    throw new Error("Range is too large (maximum span is 2^48).");
  }

  // Number of bytes needed to cover the range.
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxUint = 2 ** (bytesNeeded * 8);
  // Largest multiple of `range` that fits — values at/above are rejected.
  const limit = maxUint - (maxUint % range);

  const buf = new Uint8Array(bytesNeeded);
  // Loop until we draw a value below the limit (unbiased).
  for (;;) {
    crypto.getRandomValues(buf);
    let v = 0;
    for (let i = 0; i < bytesNeeded; i++) v = v * 256 + buf[i];
    if (v < limit) return min + (v % range);
  }
}
