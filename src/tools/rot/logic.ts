/**
 * ROT / Caesar letter rotation.
 * Pure functions — no DOM/React, safe for tests and workers.
 */

/** Shift A-Za-z by `shift` positions (0-25), wrapping within each case. */
export function caesar(text: string, shift: number): string {
  const s = ((Math.trunc(shift) % 26) + 26) % 26;
  if (s === 0) return text;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      out += String.fromCharCode(((code - 65 + s) % 26) + 65);
    } else if (code >= 97 && code <= 122) {
      out += String.fromCharCode(((code - 97 + s) % 26) + 97);
    } else {
      out += text[i];
    }
  }
  return out;
}

/** ROT13: Caesar shift of 13 over A-Za-z. Its own inverse. */
export function rot13(text: string): string {
  return caesar(text, 13);
}

/** ROT47: rotate printable ASCII (33-126) by 47. Its own inverse. */
export function rot47(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 33 && code <= 126) {
      out += String.fromCharCode(((code - 33 + 47) % 94) + 33);
    } else {
      out += text[i];
    }
  }
  return out;
}
