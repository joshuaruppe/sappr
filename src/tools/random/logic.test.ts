import { describe, expect, it } from "vitest";
import { randomBytes, format, randomToken, randomInt } from "./logic";

describe("random — bytes", () => {
  it("returns the requested number of bytes", () => {
    expect(randomBytes(1).length).toBe(1);
    expect(randomBytes(32).length).toBe(32);
    expect(randomBytes(1024).length).toBe(1024);
  });

  it("rejects out-of-range lengths", () => {
    expect(() => randomBytes(0)).toThrow();
    expect(() => randomBytes(1025)).toThrow();
    expect(() => randomBytes(1.5)).toThrow();
  });

  it("produces different output across calls (very likely)", () => {
    const a = randomToken(32, "hex");
    const b = randomToken(32, "hex");
    expect(a).not.toBe(b);
  });
});

describe("random — format", () => {
  const bytes = new Uint8Array([0, 1, 15, 16, 255, 128]);

  it("hex has two chars per byte and round-trips length", () => {
    const hex = format(bytes, "hex");
    expect(hex).toBe("00010f10ff80");
    expect(hex.length).toBe(bytes.length * 2);
  });

  it("base64 decodes back to the right byte length", () => {
    const b64 = format(bytes, "base64");
    const bin = atob(b64);
    expect(bin.length).toBe(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      expect(bin.charCodeAt(i)).toBe(bytes[i]);
    }
  });

  it("base64url avoids +,/,= and decodes to the right length", () => {
    const url = format(bytes, "base64url");
    expect(url).not.toMatch(/[+/=]/);
    const std = url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
    expect(atob(padded).length).toBe(bytes.length);
  });

  it("decimal lists each byte value", () => {
    expect(format(bytes, "decimal")).toBe("0 1 15 16 255 128");
  });
});

describe("random — randomInt", () => {
  it("stays within the inclusive range over many samples", () => {
    const min = -5;
    const max = 17;
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const v = randomInt(min, max);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(min);
      expect(v).toBeLessThanOrEqual(max);
      seen.add(v);
    }
    // Should cover the whole range with high probability.
    expect(seen.size).toBe(max - min + 1);
  });

  it("returns the only value for a single-element range", () => {
    expect(randomInt(7, 7)).toBe(7);
  });

  it("handles large ranges within bounds", () => {
    for (let i = 0; i < 1000; i++) {
      const v = randomInt(0, 1_000_000);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1_000_000);
    }
  });

  it("rejects bad arguments", () => {
    expect(() => randomInt(5, 1)).toThrow();
    expect(() => randomInt(1.5, 3)).toThrow();
  });

  it("rejects ranges above 2^48 to keep sampling unbiased", () => {
    // Above 2^48 the byte accumulation would exceed 2^53 and lose precision.
    expect(() => randomInt(0, 2 ** 48)).toThrow(); // range = 2^48 + 1
    expect(() => randomInt(0, Number.MAX_SAFE_INTEGER)).toThrow();
  });

  it("still works just under the 2^48 cap", () => {
    const max = 2 ** 48 - 2; // range = 2^48 - 1, within precision
    const v = randomInt(0, max);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(max);
  });
});
