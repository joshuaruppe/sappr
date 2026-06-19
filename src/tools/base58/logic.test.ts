import { describe, expect, it } from "vitest";
import { encodeBase58, decodeBase58 } from "./logic";

describe("base58", () => {
  it("round-trips ASCII", () => {
    const s = "hello world";
    expect(decodeBase58(encodeBase58(s))).toBe(s);
  });

  it("handles UTF-8 (emoji, accents)", () => {
    const s = "héllo 🌍";
    expect(decodeBase58(encodeBase58(s))).toBe(s);
  });

  it("matches a known vector", () => {
    expect(encodeBase58("hello")).toBe("Cn8eVZg");
    expect(decodeBase58("Cn8eVZg")).toBe("hello");
  });

  it("ignores surrounding whitespace when decoding", () => {
    expect(decodeBase58("  Cn8eVZg\n")).toBe("hello");
  });

  it("throws on invalid characters", () => {
    expect(() => decodeBase58("0OIl")).toThrow();
  });

  it("returns empty string for empty input", () => {
    expect(encodeBase58("")).toBe("");
    expect(decodeBase58("")).toBe("");
    expect(decodeBase58("   ")).toBe("");
  });
});
