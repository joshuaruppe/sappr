import { describe, expect, it } from "vitest";
import { encodeBase64, decodeBase64 } from "./logic";

describe("base64", () => {
  it("round-trips ASCII", () => {
    expect(encodeBase64("hello")).toBe("aGVsbG8=");
    expect(decodeBase64("aGVsbG8=")).toBe("hello");
  });

  it("handles UTF-8 (emoji, accents)", () => {
    const s = "héllo 🌍";
    expect(decodeBase64(encodeBase64(s))).toBe(s);
  });

  it("supports the URL-safe alphabet", () => {
    const bytes = "<<???>>"; // produces + and / in standard alphabet
    const std = encodeBase64(bytes);
    const url = encodeBase64(bytes, { urlSafe: true });
    expect(url).not.toContain("+");
    expect(url).not.toContain("/");
    // URL-safe decodes the same way.
    expect(decodeBase64(url)).toBe(bytes);
    expect(decodeBase64(std)).toBe(bytes);
  });

  it("can omit padding and still decode", () => {
    const out = encodeBase64("any carnal pleasure.", { padding: false });
    expect(out.endsWith("=")).toBe(false);
    expect(decodeBase64(out)).toBe("any carnal pleasure.");
  });

  it("ignores surrounding whitespace when decoding", () => {
    expect(decodeBase64("  aGVs bG8=\n")).toBe("hello");
  });

  it("throws on invalid characters", () => {
    expect(() => decodeBase64("not*valid")).toThrow();
  });

  it("returns empty string for empty input", () => {
    expect(encodeBase64("")).toBe("");
    expect(decodeBase64("")).toBe("");
  });
});
