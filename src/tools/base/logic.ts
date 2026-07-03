/**
 * Byte-encoding codecs for the unified Base tool: Base64, Base32, Base58 and
 * hex (base16), all over UTF-8 bytes. Pure functions — no DOM, safe to call
 * from a Web Worker or a test. Each base keeps its own options; the tool shows
 * only the ones relevant to the selected base + mode.
 */
import { base32 } from "rfc4648";
import bs58 from "bs58";

export type BaseKind = "base64" | "base32" | "base58" | "hex";

export interface BaseInfo {
  value: BaseKind;
  label: string;
  /** Example shown as the decode-input placeholder. */
  decodePlaceholder: string;
}

/** Display order and per-base labels/placeholders for the selector. */
export const BASES: BaseInfo[] = [
  { value: "base64", label: "Base64", decodePlaceholder: "SGVsbG8sIHdvcmxkIQ==" },
  { value: "base32", label: "Base32", decodePlaceholder: "NBSWY3DP" },
  { value: "base58", label: "Base58", decodePlaceholder: "Cn8eVZg" },
  { value: "hex", label: "Hex", decodePlaceholder: "48 65 6c 6c 6f" },
];

// --- Base64 -------------------------------------------------------------------

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

export function encodeBase64(text: string, opts: Base64EncodeOptions = {}): string {
  const bytes = new TextEncoder().encode(text);
  let out = bytesToBase64(bytes, opts.urlSafe ?? false);
  if (opts.padding === false) out = out.replace(/=+$/g, "");
  return out;
}

export function decodeBase64(input: string, opts: Base64DecodeOptions = {}): string {
  const bytes = base64ToBytes(input);
  return new TextDecoder("utf-8", { fatal: opts.strict ?? false }).decode(bytes);
}

/** Decode Base64 to its raw bytes (for binary-format detection, not text). */
export function decodeBase64Bytes(input: string): Uint8Array {
  return base64ToBytes(input);
}

// --- Base32 (RFC 4648) --------------------------------------------------------

export interface Base32EncodeOptions {
  /** Emit '=' padding (default true). */
  padding?: boolean;
  /** Lowercase the output alphabet. */
  lowercase?: boolean;
}

export function encodeBase32(text: string, opts: Base32EncodeOptions = {}): string {
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

// --- Base58 (Bitcoin alphabet) ------------------------------------------------

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

// --- Hex (base16) -------------------------------------------------------------

export type HexDelimiter = "none" | "space" | "0x" | "\\x" | "colon";

export interface HexEncodeOptions {
  /** How to separate / prefix each byte's pair of hex digits. */
  delimiter?: HexDelimiter;
  /** Emit A-F instead of a-f. */
  uppercase?: boolean;
}

function bytesToHexPairs(bytes: Uint8Array, uppercase: boolean): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    let h = bytes[i].toString(16).padStart(2, "0");
    if (uppercase) h = h.toUpperCase();
    pairs.push(h);
  }
  return pairs;
}

function joinPairs(pairs: string[], delimiter: HexDelimiter): string {
  switch (delimiter) {
    case "space":
      return pairs.join(" ");
    case "colon":
      return pairs.join(":");
    case "0x":
      return pairs.map((p) => "0x" + p).join(" ");
    case "\\x":
      return pairs.map((p) => "\\x" + p).join("");
    case "none":
    default:
      return pairs.join("");
  }
}

export function encodeHex(text: string, opts: HexEncodeOptions = {}): string {
  const bytes = new TextEncoder().encode(text);
  const pairs = bytesToHexPairs(bytes, opts.uppercase ?? false);
  return joinPairs(pairs, opts.delimiter ?? "none");
}

export function decodeHex(input: string): string {
  // Strip common prefixes and separators: 0x, \x, spaces, colons.
  let s = input.replace(/0x/gi, "").replace(/\\x/gi, "").replace(/[\s:]+/g, "");
  if (s === "") return "";

  if (!/^[0-9a-fA-F]*$/.test(s)) {
    throw new Error("Input contains characters that are not valid hex.");
  }
  if (s.length % 2 !== 0) {
    throw new Error("Invalid hex length (odd number of digits).");
  }

  const bytes = new Uint8Array(s.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder("utf-8").decode(bytes);
}
