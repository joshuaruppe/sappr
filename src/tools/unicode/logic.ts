/**
 * Unicode inspection — break text into code points and describe each one.
 * Pure functions: no DOM/React. Iterates by code point so astral characters
 * (emoji, etc.) count as a single entry.
 */

export interface CharFlags {
  /** Zero-width formatting characters (e.g. ZWSP, ZWJ, ZWNJ, BOM). */
  zeroWidth: boolean;
  /** Invisible / suspicious: zero-width, bidi controls, soft hyphen, etc. */
  invisible: boolean;
  /** C0/C1 control characters (excluding common whitespace handling below). */
  control: boolean;
  /** Combining marks (Unicode category M, approximated by range). */
  combining: boolean;
  /** Anything outside the printable ASCII range (0x20–0x7E). */
  nonAscii: boolean;
}

export interface CharEscapes {
  /** JavaScript escape, e.g. "\\u0041" or surrogate pair "\\uD83D\\uDE00". */
  js: string;
  /** HTML numeric entity, e.g. "&#x41;". */
  html: string;
  /** Percent-encoded UTF-8 bytes, e.g. "%41" or "%F0%9F%98%80". */
  url: string;
}

export interface CharInfo {
  /** The character itself (may be a surrogate pair / multi-byte). */
  char: string;
  /** Unicode code point as a number. */
  codePoint: number;
  /** Code point as "U+XXXX" (at least 4 hex digits, uppercase). */
  hex: string;
  /** Code point in decimal (same as codePoint, kept for the table). */
  decimal: number;
  /** UTF-8 encoding as space-free hex, e.g. "F09F9880". */
  utf8Bytes: string;
  escapes: CharEscapes;
  flags: CharFlags;
}

export interface InspectSummary {
  /** UTF-16 code unit length of the input (`text.length`). */
  chars: number;
  /** Number of code points (entries returned by `inspect`). */
  codePoints: number;
  /** Total UTF-8 byte length. */
  bytes: number;
  /** Count of suspicious code points (zero-width or otherwise invisible). */
  suspicious: number;
}

/**
 * Zero-width / invisible formatting characters that are commonly used to hide
 * data or spoof text. These are flagged as `zeroWidth`.
 */
const ZERO_WIDTH = new Set<number>([
  0x200b, // zero width space
  0x200c, // zero width non-joiner
  0x200d, // zero width joiner
  0x2060, // word joiner
  0xfeff, // zero width no-break space / BOM
  0x180e, // mongolian vowel separator
]);

/**
 * Other invisible / suspicious code points (bidi controls, directional marks,
 * soft hyphen, interlinear annotation, tags, etc.). These set `invisible`.
 */
function isInvisibleExtra(cp: number): boolean {
  return (
    cp === 0x00ad || // soft hyphen
    (cp >= 0x200e && cp <= 0x200f) || // LRM / RLM
    (cp >= 0x202a && cp <= 0x202e) || // bidi embeddings/overrides
    (cp >= 0x2066 && cp <= 0x2069) || // bidi isolates
    cp === 0x061c || // arabic letter mark
    (cp >= 0xfff9 && cp <= 0xfffb) || // interlinear annotation
    (cp >= 0xe0000 && cp <= 0xe007f) // tag characters
  );
}

function isControl(cp: number): boolean {
  // C0 controls (0x00–0x1F), DEL (0x7F), and C1 controls (0x80–0x9F).
  return (cp >= 0x00 && cp <= 0x1f) || cp === 0x7f || (cp >= 0x80 && cp <= 0x9f);
}

function isCombining(cp: number): boolean {
  // Approximate the major combining-mark blocks (Unicode category M).
  return (
    (cp >= 0x0300 && cp <= 0x036f) || // Combining Diacritical Marks
    (cp >= 0x1ab0 && cp <= 0x1aff) || // ... Extended
    (cp >= 0x1dc0 && cp <= 0x1dff) || // ... Supplement
    (cp >= 0x20d0 && cp <= 0x20ff) || // ... for Symbols
    (cp >= 0xfe20 && cp <= 0xfe2f) // Combining Half Marks
  );
}

/** Encode a single character to its UTF-8 bytes. */
function utf8BytesOf(char: string): Uint8Array {
  return new TextEncoder().encode(char);
}

function toHexByte(b: number): string {
  return b.toString(16).toUpperCase().padStart(2, "0");
}

function jsEscape(char: string, codePoint: number): string {
  if (codePoint > 0xffff) {
    // Emit the surrogate pair so it pastes into any JS source.
    let out = "";
    for (let i = 0; i < char.length; i++) {
      out += "\\u" + char.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0");
    }
    return out;
  }
  return "\\u" + codePoint.toString(16).toUpperCase().padStart(4, "0");
}

function describeCodePoint(cp: number, char: string): CharInfo {
  const bytes = utf8BytesOf(char);
  const utf8Hex = Array.from(bytes, toHexByte).join("");

  const zeroWidth = ZERO_WIDTH.has(cp);
  const invisible = zeroWidth || isInvisibleExtra(cp);
  const control = isControl(cp);
  const combining = isCombining(cp);
  const nonAscii = cp < 0x20 || cp > 0x7e;

  const hexDigits = cp.toString(16).toUpperCase().padStart(4, "0");

  return {
    char,
    codePoint: cp,
    hex: "U+" + hexDigits,
    decimal: cp,
    utf8Bytes: utf8Hex,
    escapes: {
      js: jsEscape(char, cp),
      html: "&#x" + cp.toString(16).toUpperCase() + ";",
      url: Array.from(bytes, (b) => "%" + toHexByte(b)).join(""),
    },
    flags: { zeroWidth, invisible, control, combining, nonAscii },
  };
}

/**
 * Inspect every code point of `text`. Empty input returns an empty array.
 */
export function inspect(text: string): CharInfo[] {
  if (!text) return [];
  const out: CharInfo[] = [];
  // for..of iterates by code point, so astral chars are one entry.
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (cp === undefined) continue;
    out.push(describeCodePoint(cp, char));
  }
  return out;
}

/**
 * Summarize the input: code unit length, code point count, UTF-8 byte length
 * and the number of suspicious (zero-width / invisible) code points.
 */
export function summarize(text: string): InspectSummary {
  if (!text) return { chars: 0, codePoints: 0, bytes: 0, suspicious: 0 };
  return summarizeFrom(inspect(text), text);
}

/** Like summarize(), but reuses an already-computed inspect() result. */
export function summarizeFrom(
  infos: CharInfo[],
  text: string,
): InspectSummary {
  let suspicious = 0;
  for (const info of infos) {
    if (info.flags.zeroWidth || info.flags.invisible) suspicious++;
  }
  return {
    chars: text.length,
    codePoints: infos.length,
    bytes: new TextEncoder().encode(text).length,
    suspicious,
  };
}
