/**
 * QR decoding over raw RGBA image data.
 * Pure-ish function — no DOM; safe to call from a test or worker.
 */

import jsQR from "jsqr";

/**
 * Decode a QR code from raw RGBA pixel data.
 * Returns the decoded text, or `null` if no QR code was found.
 */
export function decodeImageData(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): string | null {
  if (w <= 0 || h <= 0 || data.length === 0) return null;
  const res = jsQR(data, w, h);
  return res?.data ?? null;
}
