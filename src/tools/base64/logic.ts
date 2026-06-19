/**
 * Base64 encode/decode over UTF-8 bytes, with standard and URL-safe alphabets.
 * Pure functions — no DOM, safe to call from a Web Worker or a test.
 */

export interface Base64EncodeOptions {
  /** Use the URL-safe alphabet (-_ instead of +/). */
  urlSafe?: boolean;
  /** Emit '=' padding (default true). */
  padding?: boolean;
}

export interface Base64DecodeOptions {
  /** Throw on invalid UTF-8 instead of inserting replacement chars. */
  strict?: boolean;
}

const B64_CHARS = /^[A-Za-z0-9+/=\-_\s]*$/;

function bytesToBase64(bytes: Uint8Array, urlSafe: boolean): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  let b64 = btoa(bin);
  if (urlSafe) b64 = b64.replace(/\+/g, "-").replace(/\//g, "_");
  return b64;
}

function base64ToBytes(input: string): Uint8Array {
  let s = input.replace(/\s+/g, "");
  if (s === "") return new Uint8Array(0);
  if (!B64_CHARS.test(input)) {
    throw new Error("Input contains characters that are not valid Base64.");
  }
  // Normalize URL-safe alphabet back to standard.
  s = s.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/g, "");
  const mod = s.length % 4;
  if (mod === 1) {
    throw new Error("Invalid Base64 length (truncated input).");
  }
  if (mod === 2) s += "==";
  else if (mod === 3) s += "=";

  let bin: string;
  try {
    bin = atob(s);
  } catch {
    throw new Error("Could not decode Base64 (malformed input).");
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeBase64(
  text: string,
  opts: Base64EncodeOptions = {},
): string {
  const bytes = new TextEncoder().encode(text);
  let out = bytesToBase64(bytes, opts.urlSafe ?? false);
  if (opts.padding === false) out = out.replace(/=+$/g, "");
  return out;
}

export function decodeBase64(
  input: string,
  opts: Base64DecodeOptions = {},
): string {
  const bytes = base64ToBytes(input);
  return new TextDecoder("utf-8", { fatal: opts.strict ?? false }).decode(bytes);
}
