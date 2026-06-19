import { describe, expect, it } from "vitest";
import { encodeHex, decodeHex } from "./logic";

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
