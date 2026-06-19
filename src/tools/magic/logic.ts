/**
 * "Magic" auto-detector: given an unknown blob, recursively try a set of
 * reversible decoders and rank the results by how "text-like" they look.
 *
 * Pure functions — no DOM/React. Safe for tests and Web Workers.
 *
 * Each decoder is *guarded*: it only runs when the input plausibly matches its
 * shape, so we don't waste branching on obviously-wrong transforms. Results are
 * scored by a printable ratio plus an English-ish heuristic, deduped by output
 * and returned best-first.
 */

export interface Candidate {
  /** The chain of operations applied, in order (e.g. ["Base64", "URL-decode"]). */
  ops: string[];
  /** The decoded text for this chain. */
  output: string;
  /** Heuristic "how text-like is this" score; higher is better. */
  score: number;
  /** Fraction of printable characters in `output`, 0..1. */
  printableRatio: number;
}

export interface DetectOptions {
  /** Maximum recursion depth (number of chained decodes). Default 3. */
  maxDepth?: number;
}

interface Decoder {
  name: string;
  /** Returns the decoded string, or null if it doesn't plausibly apply. */
  run: (input: string) => string | null;
}

const COMMON_WORDS = [
  "the",
  "and",
  "that",
  "have",
  "for",
  "not",
  "with",
  "you",
  "this",
  "but",
  "his",
  "from",
  "they",
  "say",
  "her",
  "she",
  "will",
  "one",
  "all",
  "would",
  "there",
  "their",
  "what",
  "hello",
  "world",
  "secret",
  "test",
  "flag",
  "password",
];

/** Decode a byte array to UTF-8, inserting replacement chars on bad bytes. */
function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/** Fraction of characters that are printable ASCII (incl. tab/newline). */
export function printableRatio(s: string): number {
  if (s.length === 0) return 0;
  let printable = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    // Space..~ are printable; tab/newline/carriage-return count too.
    if ((c >= 0x20 && c <= 0x7e) || c === 0x09 || c === 0x0a || c === 0x0d) {
      printable++;
    }
  }
  return printable / s.length;
}

/**
 * Score a candidate string for "text-likeness". Combines the printable ratio
 * with bonuses for spaces, common words and structured-data markers, and
 * penalties for control characters and replacement glyphs.
 */
export function scoreText(s: string): number {
  if (s.length === 0) return 0;
  const ratio = printableRatio(s);
  let score = ratio * 100;

  // Control chars (excluding tab/newline/CR) and U+FFFD replacement chars hurt.
  let bad = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0xfffd) bad += 2;
    else if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) bad += 1;
    else if (c === 0x7f) bad += 1;
  }
  score -= (bad / s.length) * 120;

  // Spaces are a strong signal of natural-language text.
  const spaces = (s.match(/ /g) ?? []).length;
  const spaceRatio = spaces / s.length;
  if (spaceRatio > 0.03 && spaceRatio < 0.3) score += 12;

  // Common English words.
  const lower = s.toLowerCase();
  let wordHits = 0;
  for (const w of COMMON_WORDS) {
    if (lower.includes(w)) wordHits++;
  }
  score += Math.min(wordHits, 6) * 6;

  // Structured-data markers.
  if (/^\s*[[{]/.test(s) && /[\]}]\s*$/.test(s)) score += 10; // JSON-ish
  if (/https?:\/\//i.test(s)) score += 10; // URL
  if (/-----BEGIN [A-Z ]+-----/.test(s)) score += 20; // PEM
  if (/[a-z]+:\/\//i.test(s)) score += 4; // any scheme

  // Mostly-alphanumeric soup (e.g. another layer of base64) is less satisfying
  // as a *final* answer, but still valid — nudge it down slightly.
  if (/^[A-Za-z0-9+/=_-]+$/.test(s.trim()) && !/ /.test(s)) score -= 8;

  return score;
}

// ---------------------------------------------------------------------------
// Individual reversible decoders, each guarded to only apply when plausible.
// ---------------------------------------------------------------------------

function tryBase64(input: string): string | null {
  const s = input.replace(/\s+/g, "");
  if (s.length < 4) return null;
  const isStd = /^[A-Za-z0-9+/]+={0,2}$/.test(s);
  const isUrl = /^[A-Za-z0-9_-]+={0,2}$/.test(s);
  if (!isStd && !isUrl) return null;
  let norm = s.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/g, "");
  const mod = norm.length % 4;
  if (mod === 1) return null;
  if (mod === 2) norm += "==";
  else if (mod === 3) norm += "=";
  let bin: string;
  try {
    bin = atob(norm);
  } catch {
    return null;
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytesToUtf8(bytes);
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function tryBase32(input: string): string | null {
  const s = input.replace(/\s+/g, "").replace(/=+$/g, "").toUpperCase();
  if (s.length < 4) return null;
  if (!/^[A-Z2-7]+$/.test(s)) return null;
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(s[i]);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 0xff);
    }
  }
  if (out.length === 0) return null;
  return bytesToUtf8(Uint8Array.from(out));
}

function tryHex(input: string): string | null {
  const s = input.replace(/\s+/g, "").replace(/^0x/i, "");
  if (s.length < 2 || s.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(s)) return null;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(s.substr(i * 2, 2), 16);
  }
  return bytesToUtf8(out);
}

function tryUrlDecode(input: string): string | null {
  if (!/%[0-9a-fA-F]{2}/.test(input)) return null;
  try {
    const decoded = decodeURIComponent(input);
    return decoded === input ? null : decoded;
  } catch {
    return null;
  }
}

function rot13(input: string): string | null {
  if (!/[a-zA-Z]/.test(input)) return null;
  const out = input.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + 13) % 26) + base);
  });
  return out === input ? null : out;
}

function rot47(input: string): string | null {
  // ROT47 only affects '!'..'~'; require some of those to be present.
  if (!/[!-~]/.test(input)) return null;
  let changed = false;
  const out = input.replace(/[!-~]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const rotated = 33 + ((code - 33 + 47) % 94);
    if (rotated !== code) changed = true;
    return String.fromCharCode(rotated);
  });
  return changed ? out : null;
}

function tryDecimalBytes(input: string): string | null {
  const parts = input.trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length < 2) return null;
  if (!parts.every((p) => /^\d{1,3}$/.test(p))) return null;
  const nums = parts.map(Number);
  if (!nums.every((n) => n >= 0 && n <= 255)) return null;
  return bytesToUtf8(Uint8Array.from(nums));
}

function tryBinaryBytes(input: string): string | null {
  const compact = input.replace(/\s+/g, "");
  // Space-separated octets, or one long stream divisible by 8.
  if (/\s/.test(input.trim())) {
    const parts = input.trim().split(/\s+/);
    if (parts.length < 2) return null;
    if (!parts.every((p) => /^[01]{8}$/.test(p))) return null;
    const nums = parts.map((p) => parseInt(p, 2));
    return bytesToUtf8(Uint8Array.from(nums));
  }
  if (compact.length >= 16 && compact.length % 8 === 0 && /^[01]+$/.test(compact)) {
    const nums: number[] = [];
    for (let i = 0; i < compact.length; i += 8) {
      nums.push(parseInt(compact.substr(i, 8), 2));
    }
    return bytesToUtf8(Uint8Array.from(nums));
  }
  return null;
}

function tryReverse(input: string): string | null {
  if (input.length < 2) return null;
  const out = [...input].reverse().join("");
  return out === input ? null : out;
}

const DECODERS: Decoder[] = [
  { name: "Base64", run: tryBase64 },
  { name: "Base32", run: tryBase32 },
  { name: "Hex", run: tryHex },
  { name: "URL-decode", run: tryUrlDecode },
  { name: "ROT13", run: rot13 },
  { name: "ROT47", run: rot47 },
  { name: "Decimal bytes", run: tryDecimalBytes },
  { name: "Binary bytes", run: tryBinaryBytes },
  { name: "Reverse", run: tryReverse },
];

/**
 * Recursively decode `input`, returning every distinct reachable string with the
 * op-chain that produced it, scored and sorted best-first.
 */
export function detectAndDecode(
  input: string,
  opts: DetectOptions = {},
): Candidate[] {
  const maxDepth = Math.max(1, opts.maxDepth ?? 3);
  if (!input) return [];

  // Map of output -> best candidate seen for it (shortest/best-scoring chain).
  const found = new Map<string, Candidate>();
  // Guard against runaway branching.
  let budget = 400;

  function record(output: string, ops: string[]) {
    const ratio = printableRatio(output);
    const score = scoreText(output);
    const existing = found.get(output);
    if (!existing || score > existing.score) {
      found.set(output, { ops: [...ops], output, score, printableRatio: ratio });
    }
  }

  function recurse(current: string, ops: string[], depth: number) {
    if (depth >= maxDepth || budget <= 0) return;
    for (const dec of DECODERS) {
      if (budget <= 0) break;
      let result: string | null;
      try {
        result = dec.run(current);
      } catch {
        result = null;
      }
      if (result == null || result === current) continue;
      budget--;
      const nextOps = [...ops, dec.name];
      record(result, nextOps);

      // Only recurse into branches that still look like they *could* carry
      // another encoded layer: reasonably printable and non-trivial length.
      const ratio = printableRatio(result);
      if (ratio > 0.85 && result.length >= 4 && depth + 1 < maxDepth) {
        recurse(result, nextOps, depth + 1);
      }
    }
  }

  try {
    recurse(input, [], 0);
  } catch {
    // Defensive: never throw to the caller.
  }

  return [...found.values()]
    .sort((a, b) => b.score - a.score || a.ops.length - b.ops.length)
    .slice(0, 12);
}
