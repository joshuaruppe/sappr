import { describe, expect, it } from "vitest";
import {
  encodeBase64,
  decodeBase64,
  decodeBase64Bytes,
  encodeBase32,
  decodeBase32,
  encodeBase58,
  decodeBase58,
  encodeHex,
  decodeHex,
} from "./logic";

describe("base58 whitespace tolerance", () => {
  it("ignores internal whitespace when decoding", () => {
    const enc = encodeBase58("hello world");
    const spaced = `${enc.slice(0, 4)} ${enc.slice(4)}`;
    expect(decodeBase58(spaced)).toBe("hello world");
  });
});

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

  it("decodes to raw bytes for format detection", () => {
    expect(Array.from(decodeBase64Bytes("aGk="))).toEqual([104, 105]);
    expect(decodeBase64Bytes("").length).toBe(0);
  });
});

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

describe("hex", () => {
  it("encodes ASCII", () => {
    expect(encodeHex("Hi")).toBe("4869");
  });

  it("decodes ASCII", () => {
    expect(decodeHex("4869")).toBe("Hi");
  });

  it("supports delimiters", () => {
    expect(encodeHex("Hi", { delimiter: "space" })).toBe("48 69");
    expect(encodeHex("Hi", { delimiter: "colon" })).toBe("48:69");
    expect(encodeHex("Hi", { delimiter: "0x" })).toBe("0x48 0x69");
    expect(encodeHex("Hi", { delimiter: "\\x" })).toBe("\\x48\\x69");
  });

  it("supports uppercase", () => {
    expect(encodeHex("z", { uppercase: true })).toBe("7A");
    expect(encodeHex("z")).toBe("7a");
  });

  it("strips delimiters and accepts mixed case when decoding", () => {
    expect(decodeHex("0x48 0x69")).toBe("Hi");
    expect(decodeHex("48:69")).toBe("Hi");
    expect(decodeHex("\\x48\\x69")).toBe("Hi");
    expect(decodeHex("4A")).toBe("J");
    expect(decodeHex("4a")).toBe("J");
  });

  it("round-trips UTF-8 emoji", () => {
    const s = "héllo 🌍";
    expect(decodeHex(encodeHex(s))).toBe(s);
  });

  it("throws on odd length", () => {
    expect(() => decodeHex("486")).toThrow();
  });

  it("throws on invalid characters", () => {
    expect(() => decodeHex("48zz")).toThrow();
  });

  it("returns empty string for empty input", () => {
    expect(encodeHex("")).toBe("");
    expect(decodeHex("")).toBe("");
  });
});
