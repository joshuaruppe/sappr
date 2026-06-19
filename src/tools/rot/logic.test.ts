import { describe, expect, it } from "vitest";
import { rot13, rot47, caesar } from "./logic";

describe("rot", () => {
  it("rot13 transforms and is its own inverse", () => {
    expect(rot13("Hello")).toBe("Uryyb");
    expect(rot13("Uryyb")).toBe("Hello");
    expect(rot13(rot13("The quick brown fox"))).toBe("The quick brown fox");
  });

  it("rot13 leaves non-letters untouched", () => {
    expect(rot13("abc 123!")).toBe("nop 123!");
  });

  it("rot47 transforms a known sample and is its own inverse", () => {
    expect(rot47("Hello, World!")).toBe("w6==@[ (@C=5P");
    expect(rot47("w6==@[ (@C=5P")).toBe("Hello, World!");
  });

  it("rot47 leaves characters outside 33-126 untouched", () => {
    expect(rot47(" \t")).toBe(" \t");
  });

  it("caesar shifts forward by the given amount", () => {
    expect(caesar("abc", 3)).toBe("def");
    expect(caesar("XYZ", 3)).toBe("ABC");
  });

  it("caesar decodes by shifting backwards", () => {
    expect(caesar("def", -3)).toBe("abc");
    expect(caesar(caesar("Attack at dawn", 5), -5)).toBe("Attack at dawn");
  });

  it("caesar normalises shifts and handles 0", () => {
    expect(caesar("hello", 0)).toBe("hello");
    expect(caesar("hello", 26)).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(rot13("")).toBe("");
    expect(rot47("")).toBe("");
    expect(caesar("", 3)).toBe("");
  });
});
