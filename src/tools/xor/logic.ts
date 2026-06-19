/**
 * Repeating-key XOR cipher with multi-format I/O, plus single-byte brute force.
 * Pure functions — no DOM/React; safe for tests and Web Workers.
 */

export type ByteFormat = "utf8" | "hex" | "base64";

/** XOR `inputBytes` against `keyBytes`, repeating the key cyclically. */
export function xorCipher(
  inputBytes: Uint8Array,
  keyBytes: Uint8Array,
): Uint8Array {
  if (keyBytes.length === 0) {
    throw new Error("Key must not be empty.");
  }
  const out = new Uint8Array(inputBytes.length);
  for (let i = 0; i < inputBytes.length; i++) {
    out[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Parsing (string -> bytes)
// ---------------------------------------------------------------------------

const HEX_CHARS = /^[0-9a-fA-F\s]*$/;
const B64_CHARS = /^[A-Za-z0-9+/=\-_\s]*$/;

function hexToBytes(input: string): Uint8Array {
  const s = input.replace(/\s+/g, "");
  if (s === "") return new Uint8Array(0);
  if (!HEX_CHARS.test(input)) {
    throw new Error("Input contains characters that are not valid hex.");
  }
  if (s.length % 2 !== 0) {
    throw new Error("Hex input must have an even number of digits.");
  }
  const bytes = new Uint8Array(s.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function base64ToBytes(input: string): Uint8Array {
  let s = input.replace(/\s+/g, "");
  if (s === "") return new Uint8Array(0);
  if (!B64_CHARS.test(input)) {
    throw new Error("Input contains characters that are not valid Base64.");
  }
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

/** Parse a string into bytes according to the chosen format. */
export function parseBytes(input: string, format: ByteFormat): Uint8Array {
  switch (format) {
    case "utf8":
      return new TextEncoder().encode(input);
    case "hex":
      return hexToBytes(input);
    case "base64":
      return base64ToBytes(input);
  }
}

// ---------------------------------------------------------------------------
// Formatting (bytes -> string)
// ---------------------------------------------------------------------------

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/** Format bytes into a string according to the chosen format. */
export function formatBytesAs(bytes: Uint8Array, format: ByteFormat): string {
  switch (format) {
    case "utf8":
      return bytesToUtf8(bytes);
    case "hex":
      return bytesToHex(bytes);
    case "base64":
      return bytesToBase64(bytes);
  }
}

// ---------------------------------------------------------------------------
// Single-byte brute force
// ---------------------------------------------------------------------------

export interface SingleByteCandidate {
  /** The XOR key byte (0–255). */
  key: number;
  /** Decoded output, with the key applied, as Latin-1 text. */
  output: string;
  /** Fraction of bytes that are printable ASCII (0–1). */
  printableRatio: number;
  /** English-likeness heuristic used to break printable-ratio ties. */
  textScore: number;
}

/** True for printable ASCII (incl. common whitespace: tab, newline, CR). */
function isPrintable(byte: number): boolean {
  return (byte >= 0x20 && byte <= 0x7e) || byte === 9 || byte === 10 || byte === 13;
}

/**
 * Try all 256 single-byte XOR keys against `bytes`. Returns every candidate,
 * sorted by `printableRatio` descending, then by an English-likeness score so
 * that real plaintext beats printable-but-garbage decodings on ties.
 */
export function bruteForceSingleByte(
  bytes: Uint8Array,
  limit = 256,
): SingleByteCandidate[] {
  // First pass: score every key WITHOUT building the decoded string (ranking
  // only needs printableRatio + textScore).
  const scored: { key: number; printableRatio: number; textScore: number }[] = [];
  for (let key = 0; key < 256; key++) {
    let printable = 0;
    let textScore = 0;
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i] ^ key;
      if (isPrintable(b)) printable++;
      if (b === 0x20)
        textScore += 2; // spaces are very common in text
      else if ((b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a))
        textScore += 1; // ASCII letters
      else if (b < 0x20 && b !== 9 && b !== 10 && b !== 13)
        textScore -= 5; // control bytes strongly suggest non-text
    }
    const printableRatio = bytes.length === 0 ? 0 : printable / bytes.length;
    scored.push({ key, printableRatio, textScore });
  }
  scored.sort(
    (a, b) =>
      b.printableRatio - a.printableRatio ||
      b.textScore - a.textScore ||
      a.key - b.key,
  );
  // Build the decoded string only for the candidates actually returned.
  return scored.slice(0, limit).map(({ key, printableRatio, textScore }) => {
    let output = "";
    for (let i = 0; i < bytes.length; i++) {
      output += String.fromCharCode(bytes[i] ^ key);
    }
    return { key, output, printableRatio, textScore };
  });
}
