import { describe, expect, it } from "vitest";
import { decodeImageData } from "./logic";

/** Build an all-white opaque RGBA buffer of w×h. */
function whiteImage(w: number, h: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  data.fill(255);
  return data;
}

describe("qr-decode", () => {
  it("returns null for a blank (all-white) image", () => {
    const w = 16;
    const h = 16;
    expect(decodeImageData(whiteImage(w, h), w, h)).toBeNull();
  });

  it("returns null for empty / zero-sized input", () => {
    expect(decodeImageData(new Uint8ClampedArray(0), 0, 0)).toBeNull();
    expect(decodeImageData(new Uint8ClampedArray(0), 10, 10)).toBeNull();
  });
});
