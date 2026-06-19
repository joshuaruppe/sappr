import { describe, expect, it } from "vitest";
import { encodeBase32, decodeBase32 } from "./logic";

describe("base32", () => {
  it("round-trips ASCII", () => {
    expect(encodeBase32("hello")).toBe("NBSWY3DP");
    expect(decodeBase32("NBSWY3DP")).toBe("hello");
  });

  it("handles UTF-8 (emoji, accents)", () => {
    const s = "héllo 🌍";
    expect(decodeBase32(encodeBase32(s))).toBe(s);
  });

  it("can omit padding and still decode", () => {
    const padded = encodeBase32("foob");
    const out = encodeBase32("foob", { padding: false });
    expect(padded.endsWith("=")).toBe(true);
    expect(out.endsWith("=")).toBe(false);
    expect(decodeBase32(out)).toBe("foob");
  });

  it("can emit lowercase output and decode it back", () => {
    const out = encodeBase32("hello", { lowercase: true });
    expect(out).toBe("nbswy3dp");
    expect(decodeBase32(out)).toBe("hello");
  });

  it("ignores surrounding whitespace when decoding", () => {
    expect(decodeBase32("  NBSW Y3DP\n")).toBe("hello");
  });

  it("throws on invalid characters", () => {
    expect(() => decodeBase32("0189")).toThrow();
  });

  it("returns empty string for empty input", () => {
    expect(encodeBase32("")).toBe("");
    expect(decodeBase32("")).toBe("");
  });
});
