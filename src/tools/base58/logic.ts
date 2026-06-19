/**
 * Base58 encode/decode (Bitcoin alphabet) over UTF-8 bytes.
 * Pure functions — no DOM, safe to call from a Web Worker or a test.
 */
import bs58 from "bs58";

export function encodeBase58(text: string): string {
  if (text === "") return "";
  return bs58.encode(new TextEncoder().encode(text));
}

export function decodeBase58(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "") return "";
  // bs58.decode throws on invalid characters (0, O, I, l, etc.).
  return new TextDecoder().decode(bs58.decode(trimmed));
}
