import { describe, expect, it } from "vitest";
import {
  xorCipher,
  parseBytes,
  formatBytesAs,
  bruteForceSingleByte,
} from "./logic";

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
function fromUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe("xorCipher", () => {
  it('round-trips "hello" with key "K"', () => {
    const input = utf8("hello");
    const key = utf8("K");
    const enc = xorCipher(input, key);
    const dec = xorCipher(enc, key);
    expect(fromUtf8(dec)).toBe("hello");
  });

  it("is self-inverse with the same key", () => {
    const input = utf8("Attack at dawn — 攻撃");
    const key = utf8("longer-key");
    const enc = xorCipher(input, key);
    expect(Array.from(xorCipher(enc, key))).toEqual(Array.from(input));
  });

  it("repeats the key cyclically", () => {
    // [0,0,0] XOR key "AB" -> ['A','B','A'] bytes
    const out = xorCipher(new Uint8Array([0, 0, 0]), utf8("AB"));
    expect(Array.from(out)).toEqual([0x41, 0x42, 0x41]);
  });

  it("throws on an empty key", () => {
    expect(() => xorCipher(utf8("x"), new Uint8Array(0))).toThrow();
  });
});

describe("parse/format round-trips", () => {
  it("parses and formats hex", () => {
    expect(formatBytesAs(parseBytes("48656c6c6f", "hex"), "utf8")).toBe("Hello");
    expect(formatBytesAs(utf8("Hello"), "hex")).toBe("48656c6c6f");
  });

  it("parses and formats base64", () => {
    expect(formatBytesAs(parseBytes("SGVsbG8=", "base64"), "utf8")).toBe(
      "Hello",
    );
    expect(formatBytesAs(utf8("Hello"), "base64")).toBe("SGVsbG8=");
  });

  it("ignores whitespace and odd casing in hex", () => {
    expect(formatBytesAs(parseBytes("48 65\n6C", "hex"), "utf8")).toBe("Hel");
  });

  it("rejects malformed hex", () => {
    expect(() => parseBytes("xyz", "hex")).toThrow();
    expect(() => parseBytes("abc", "hex")).toThrow(); // odd length
  });

  it("returns empty bytes for empty input", () => {
    expect(parseBytes("", "hex").length).toBe(0);
    expect(parseBytes("", "base64").length).toBe(0);
    expect(parseBytes("", "utf8").length).toBe(0);
  });
});

describe("bruteForceSingleByte", () => {
  it("recovers a single-byte-XORed ASCII string", () => {
    const plaintext = "The quick brown fox jumps over the lazy dog.";
    const key = 0x5a;
    const enc = xorCipher(utf8(plaintext), new Uint8Array([key]));

    const candidates = bruteForceSingleByte(enc);
    // The correct key should be the top-ranked (all-printable) candidate.
    expect(candidates[0].key).toBe(key);
    expect(candidates[0].output).toBe(plaintext);
    expect(candidates[0].printableRatio).toBe(1);
  });

  it("returns all 256 keys sorted by printable ratio descending", () => {
    const enc = xorCipher(utf8("hello world"), new Uint8Array([0x2a]));
    const candidates = bruteForceSingleByte(enc);
    expect(candidates).toHaveLength(256);
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].printableRatio).toBeGreaterThanOrEqual(
        candidates[i].printableRatio,
      );
    }
  });

  it("handles empty input without error", () => {
    const candidates = bruteForceSingleByte(new Uint8Array(0));
    expect(candidates).toHaveLength(256);
    expect(candidates[0].output).toBe("");
    expect(candidates[0].printableRatio).toBe(0);
  });

  it("returns only the requested number of candidates when limited", () => {
    const enc = xorCipher(utf8("hello world"), new Uint8Array([0x2a]));
    const top = bruteForceSingleByte(enc, 5);
    const full = bruteForceSingleByte(enc);
    expect(top).toHaveLength(5);
    // Same head of the ranking as the full result, with output materialized.
    expect(top.map((c) => c.key)).toEqual(full.slice(0, 5).map((c) => c.key));
    expect(top[0].output).toBe(full[0].output);
  });
});
