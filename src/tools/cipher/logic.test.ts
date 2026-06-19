import { describe, expect, it } from "vitest";
import { vigenere, atbash, railFence } from "./logic";

describe("vigenere", () => {
  it("encodes the classic example", () => {
    expect(vigenere("ATTACKATDAWN", "LEMON")).toBe("LXFOPVEFRNHR");
  });

  it("decodes back to the original", () => {
    expect(vigenere("LXFOPVEFRNHR", "LEMON", true)).toBe("ATTACKATDAWN");
  });

  it("preserves non-letters and case, advancing the key only on letters", () => {
    const out = vigenere("Hello, World!", "key");
    expect(out).toMatch(/^[A-Za-z, !]+$/);
    expect(out).toContain(",");
    expect(out).toContain(" ");
    expect(vigenere(out, "key", true)).toBe("Hello, World!");
  });

  it("throws when the key has no letters", () => {
    expect(() => vigenere("abc", "123")).toThrow();
  });

  it("returns empty string for empty input", () => {
    expect(vigenere("", "key")).toBe("");
  });
});

describe("atbash", () => {
  it("maps abc -> zyx", () => {
    expect(atbash("abc")).toBe("zyx");
  });

  it("is its own inverse", () => {
    const s = "Hello, World!";
    expect(atbash(atbash(s))).toBe(s);
  });

  it("preserves case and non-letters", () => {
    expect(atbash("AbZ 9!")).toBe("ZyA 9!");
  });

  it("returns empty string for empty input", () => {
    expect(atbash("")).toBe("");
  });
});

describe("railFence", () => {
  it("round-trips with 3 rails", () => {
    const text = "WEAREDISCOVEREDFLEEATONCE";
    const enc = railFence(text, 3);
    expect(railFence(enc, 3, true)).toBe(text);
  });

  it("encodes a known 3-rail example", () => {
    expect(railFence("WEAREDISCOVEREDFLEEATONCE", 3)).toBe(
      "WECRLTEERDSOEEFEAOCAIVDEN",
    );
  });

  it("round-trips across rail counts 2-10", () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    for (let r = 2; r <= 10; r++) {
      expect(railFence(railFence(text, r), r, true)).toBe(text);
    }
  });

  it("rejects out-of-range rail counts", () => {
    expect(() => railFence("abc", 1)).toThrow();
    expect(() => railFence("abc", 11)).toThrow();
  });

  it("returns empty string for empty input", () => {
    expect(railFence("", 3)).toBe("");
  });
});
