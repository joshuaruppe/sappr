/**
 * Classical ciphers: Vigenere, Atbash, Rail Fence.
 * Pure functions — no DOM, safe to call from a Web Worker or a test.
 */

const A = 65; // 'A'
const Z = 90; // 'Z'
const a = 97; // 'a'
const z = 122; // 'z'

function isUpper(code: number): boolean {
  return code >= A && code <= Z;
}

function isLower(code: number): boolean {
  return code >= a && code <= z;
}

/**
 * Vigenere cipher. Preserves non-letters and case. Only letters in the key are
 * used; the key cursor only advances on letters in the text.
 */
export function vigenere(text: string, key: string, decode = false): string {
  const keyLetters: number[] = [];
  for (const ch of key) {
    const code = ch.charCodeAt(0);
    if (isUpper(code)) keyLetters.push(code - A);
    else if (isLower(code)) keyLetters.push(code - a);
  }
  if (keyLetters.length === 0) {
    throw new Error("Vigenere key must contain at least one letter (A-Z).");
  }

  let out = "";
  let ki = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const base = isUpper(code) ? A : isLower(code) ? a : -1;
    if (base === -1) {
      out += text[i];
      continue;
    }
    let shift = keyLetters[ki % keyLetters.length];
    if (decode) shift = (26 - shift) % 26;
    const shifted = ((code - base + shift) % 26) + base;
    out += String.fromCharCode(shifted);
    ki++;
  }
  return out;
}

/** Atbash cipher (A<->Z). Its own inverse; preserves non-letters and case. */
export function atbash(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (isUpper(code)) out += String.fromCharCode(Z - (code - A));
    else if (isLower(code)) out += String.fromCharCode(z - (code - a));
    else out += text[i];
  }
  return out;
}

/**
 * Rail Fence cipher with a configurable number of rails (2-10).
 * Encodes by writing the text in a zig-zag across `rails` rows and reading off
 * row by row; decodes by reversing that mapping.
 */
export function railFence(text: string, rails: number, decode = false): string {
  if (!Number.isInteger(rails) || rails < 2 || rails > 10) {
    throw new Error("Rail count must be a whole number between 2 and 10.");
  }
  if (text.length === 0) return "";
  if (rails >= text.length) return text;

  // Compute the rail index for each character position in zig-zag order.
  const pattern: number[] = new Array(text.length);
  let row = 0;
  let dir = 1;
  for (let i = 0; i < text.length; i++) {
    pattern[i] = row;
    if (row === 0) dir = 1;
    else if (row === rails - 1) dir = -1;
    row += dir;
  }

  if (!decode) {
    const rows: string[] = Array.from({ length: rails }, () => "");
    for (let i = 0; i < text.length; i++) rows[pattern[i]] += text[i];
    return rows.join("");
  }

  // Decode: figure out how many chars land on each rail, slice the cipher text
  // into those rails, then read back following the zig-zag pattern.
  const counts = new Array(rails).fill(0);
  for (const r of pattern) counts[r]++;
  const railStrings: string[] = [];
  let pos = 0;
  for (let r = 0; r < rails; r++) {
    railStrings.push(text.slice(pos, pos + counts[r]));
    pos += counts[r];
  }
  const cursors = new Array(rails).fill(0);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const r = pattern[i];
    out += railStrings[r][cursors[r]++];
  }
  return out;
}
