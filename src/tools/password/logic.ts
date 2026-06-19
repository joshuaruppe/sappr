/**
 * Secure password generation using crypto.getRandomValues with unbiased
 * rejection sampling. Pure functions — no DOM/React, safe for tests & workers.
 */

export interface PasswordOptions {
  /** Desired password length (number of characters). */
  length: number;
  /** Include lowercase letters a-z. */
  lowercase?: boolean;
  /** Include uppercase letters A-Z. */
  uppercase?: boolean;
  /** Include digits 0-9. */
  digits?: boolean;
  /** Include symbols. */
  symbols?: boolean;
  /** Remove visually ambiguous characters (O 0 I l 1 | etc.). */
  excludeAmbiguous?: boolean;
}

export const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/",
} as const;

/** Characters that are easy to confuse with one another. */
export const AMBIGUOUS_CHARS = "O0Il1|`'\"{}[]()/\\";

/**
 * Build the effective alphabet from the selected character sets, optionally
 * stripping ambiguous characters. Throws if no character set is enabled or if
 * exclusion leaves the alphabet empty.
 */
export function buildAlphabet(opts: PasswordOptions): string {
  let alphabet = "";
  if (opts.lowercase) alphabet += CHARSETS.lowercase;
  if (opts.uppercase) alphabet += CHARSETS.uppercase;
  if (opts.digits) alphabet += CHARSETS.digits;
  if (opts.symbols) alphabet += CHARSETS.symbols;

  if (alphabet.length === 0) {
    throw new Error("Select at least one character set.");
  }

  if (opts.excludeAmbiguous) {
    const banned = new Set(AMBIGUOUS_CHARS);
    alphabet = Array.from(alphabet)
      .filter((c) => !banned.has(c))
      .join("");
    if (alphabet.length === 0) {
      throw new Error(
        "No characters left after excluding ambiguous ones — enable more sets.",
      );
    }
  }

  // De-duplicate while preserving order (sets shouldn't overlap, but be safe).
  return Array.from(new Set(Array.from(alphabet))).join("");
}

/**
 * Draw `count` unbiased indices in [0, range) using crypto.getRandomValues with
 * rejection sampling so the modulo bias is eliminated.
 */
function randomIndices(count: number, range: number): number[] {
  if (range <= 0) throw new Error("Alphabet must be non-empty.");
  const out: number[] = [];
  // Largest multiple of `range` that fits in a uint32, used as the reject cap.
  const limit = Math.floor(0x100000000 / range) * range;
  // Over-allocate the random buffer to reduce the number of crypto calls.
  const buf = new Uint32Array(Math.max(count * 2, count + 8));
  let pos = buf.length; // force an initial refill
  while (out.length < count) {
    if (pos >= buf.length) {
      crypto.getRandomValues(buf);
      pos = 0;
    }
    const v = buf[pos++];
    if (v < limit) out.push(v % range);
  }
  return out;
}

/** Generate a single password of the requested length from the options. */
export function generatePassword(opts: PasswordOptions): string {
  if (!Number.isInteger(opts.length) || opts.length < 1) {
    throw new Error("Length must be a positive integer.");
  }
  const alphabet = buildAlphabet(opts);
  const indices = randomIndices(opts.length, alphabet.length);
  let pwd = "";
  for (const i of indices) pwd += alphabet[i];
  return pwd;
}

/** Generate `count` independent passwords. */
export function generatePasswords(
  opts: PasswordOptions,
  count: number,
): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Count must be a positive integer.");
  }
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(generatePassword(opts));
  return out;
}

/**
 * Shannon entropy in bits for a uniformly random string of `length`
 * characters drawn from an alphabet of `alphabetSize` symbols: length * log2(N).
 */
export function estimateEntropyBits(
  length: number,
  alphabetSize: number,
): number {
  if (length <= 0 || alphabetSize <= 1) return 0;
  return length * Math.log2(alphabetSize);
}

export type StrengthLabel = "Weak" | "Fair" | "Strong";

/** Map entropy bits to a coarse human label. */
export function strengthLabel(bits: number): StrengthLabel {
  if (bits < 60) return "Weak";
  if (bits < 100) return "Fair";
  return "Strong";
}
