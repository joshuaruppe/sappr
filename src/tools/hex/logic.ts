/**
 * Hex (base16) encode/decode over UTF-8 bytes.
 * Pure functions — no DOM, safe to call from a Web Worker or a test.
 */

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
  let s = input
    .replace(/0x/gi, "")
    .replace(/\\x/gi, "")
    .replace(/[\s:]+/g, "");
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
