/**
 * RFC 4648 Base32 encode/decode over UTF-8 bytes.
 * Pure functions — no DOM, safe to call from a Web Worker or a test.
 */
import { base32 } from "rfc4648";

export interface Base32EncodeOptions {
  /** Emit '=' padding (default true). */
  padding?: boolean;
  /** Lowercase the output alphabet. */
  lowercase?: boolean;
}

export function encodeBase32(
  text: string,
  opts: Base32EncodeOptions = {},
): string {
  const bytes = new TextEncoder().encode(text);
  let out = base32.stringify(bytes, { pad: opts.padding ?? true });
  if (opts.lowercase) out = out.toLowerCase();
  return out;
}

export function decodeBase32(input: string): string {
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  if (cleaned === "") return "";
  const bytes = base32.parse(cleaned, { loose: true });
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}
