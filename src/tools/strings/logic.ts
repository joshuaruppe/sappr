/**
 * Extract printable strings from binary data, like the unix `strings` command.
 * Pure functions — no DOM/React, safe to call from a Web Worker or a test.
 */

export type StringsEncoding = "ascii" | "utf-16le";

export interface ExtractStringsOptions {
  /** Minimum run length to keep (in characters). Default 4. */
  minLength?: number;
  /** Byte interpretation: single-byte ASCII or 2-byte UTF-16LE. */
  encoding?: StringsEncoding;
}

export interface ExtractedString {
  /** Byte offset of the first character of the run. */
  offset: number;
  /** The decoded printable run. */
  text: string;
}

/** True for printable ASCII (space..tilde). */
function isPrintable(byte: number): boolean {
  return byte >= 0x20 && byte <= 0x7e;
}

function extractAscii(
  bytes: Uint8Array,
  minLength: number,
): ExtractedString[] {
  const out: ExtractedString[] = [];
  let start = -1;
  for (let i = 0; i < bytes.length; i++) {
    if (isPrintable(bytes[i])) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      if (i - start >= minLength) {
        out.push({ offset: start, text: asciiSlice(bytes, start, i) });
      }
      start = -1;
    }
  }
  if (start !== -1 && bytes.length - start >= minLength) {
    out.push({ offset: start, text: asciiSlice(bytes, start, bytes.length) });
  }
  return out;
}

function asciiSlice(bytes: Uint8Array, from: number, to: number): string {
  let s = "";
  for (let i = from; i < to; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function extractUtf16le(
  bytes: Uint8Array,
  minLength: number,
): ExtractedString[] {
  const out: ExtractedString[] = [];
  let start = -1;
  let count = 0;
  let text = "";
  // Walk in 2-byte pairs: [printable, 0x00].
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    if (isPrintable(bytes[i]) && bytes[i + 1] === 0x00) {
      if (start === -1) {
        start = i;
        count = 0;
        text = "";
      }
      text += String.fromCharCode(bytes[i]);
      count++;
    } else if (start !== -1) {
      if (count >= minLength) out.push({ offset: start, text });
      start = -1;
    }
  }
  if (start !== -1 && count >= minLength) out.push({ offset: start, text });
  return out;
}

export function extractStrings(
  bytes: Uint8Array,
  opts: ExtractStringsOptions = {},
): ExtractedString[] {
  const minLength = Math.max(1, Math.floor(opts.minLength ?? 4));
  const encoding = opts.encoding ?? "ascii";
  if (bytes.length === 0) return [];
  return encoding === "utf-16le"
    ? extractUtf16le(bytes, minLength)
    : extractAscii(bytes, minLength);
}

/** Render results as joined lines, optionally prefixed with a hex offset. */
export function formatStrings(
  results: ExtractedString[],
  showOffsets: boolean,
): string {
  if (!showOffsets) return results.map((r) => r.text).join("\n");
  return results
    .map((r) => `0x${r.offset.toString(16).padStart(8, "0")}  ${r.text}`)
    .join("\n");
}
