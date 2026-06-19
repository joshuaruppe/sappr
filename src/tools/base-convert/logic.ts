/**
 * Convert integers between bases using BigInt, so arbitrarily large values
 * (e.g. 2^100) round-trip without loss. Pure functions — no DOM, no React.
 */

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

export const MIN_BASE = 2;
export const MAX_BASE = 36;

function assertBase(base: number, which: string): void {
  if (
    !Number.isInteger(base) ||
    base < MIN_BASE ||
    base > MAX_BASE
  ) {
    throw new Error(`${which} base must be an integer between ${MIN_BASE} and ${MAX_BASE}.`);
  }
}

/** Parse a string of digits in `fromBase` into a BigInt. Throws on invalid digits. */
function parseBigInt(value: string, fromBase: number): bigint {
  assertBase(fromBase, "Source");
  let s = value.trim();
  if (s === "") {
    throw new Error("No value to parse.");
  }

  let negative = false;
  if (s[0] === "+" || s[0] === "-") {
    negative = s[0] === "-";
    s = s.slice(1);
  }
  if (s === "") {
    throw new Error("No digits to parse.");
  }

  const big = BigInt(fromBase);
  let result = 0n;
  for (const ch of s.toLowerCase()) {
    const digit = DIGITS.indexOf(ch);
    if (digit < 0 || digit >= fromBase) {
      throw new Error(`"${ch}" is not a valid digit for base ${fromBase}.`);
    }
    result = result * big + BigInt(digit);
  }
  return negative ? -result : result;
}

/** Format a BigInt into a string of digits in `toBase`. */
function formatBigInt(value: bigint, toBase: number): string {
  assertBase(toBase, "Target");
  if (value === 0n) return "0";

  const negative = value < 0n;
  let n = negative ? -value : value;
  const big = BigInt(toBase);
  let out = "";
  while (n > 0n) {
    const rem = Number(n % big);
    out = DIGITS[rem] + out;
    n = n / big;
  }
  return negative ? "-" + out : out;
}

/**
 * Convert `value` (a string of digits in `fromBase`) into its representation in
 * `toBase`. Output digits a-z are lowercase. Throws on invalid digits/bases.
 */
export function convertBase(
  value: string,
  fromBase: number,
  toBase: number,
): string {
  const n = parseBigInt(value, fromBase);
  return formatBigInt(n, toBase);
}

export interface StandardBases {
  binary: string;
  octal: string;
  decimal: string;
  hex: string;
}

/** Return the value rendered in all four standard bases at once. */
export function toStandardBases(
  value: string,
  fromBase: number,
): StandardBases {
  const n = parseBigInt(value, fromBase);
  return {
    binary: formatBigInt(n, 2),
    octal: formatBigInt(n, 8),
    decimal: formatBigInt(n, 10),
    hex: formatBigInt(n, 16),
  };
}
