import { describe, expect, it } from "vitest";
import { extractStrings, formatStrings } from "./logic";

const enc = (s: string) => new TextEncoder().encode(s);

describe("strings", () => {
  it("finds an ASCII run amid non-printable bytes", () => {
    const bytes = enc("ab\x00\x01hello");
    const out = extractStrings(bytes, { minLength: 4 });
    expect(out).toEqual([{ offset: 4, text: "hello" }]);
  });

  it("filters runs shorter than minLength", () => {
    const bytes = enc("ab\x00\x01hello");
    // "ab" (len 2) and "hello" (len 5): minLength 3 keeps only "hello".
    expect(extractStrings(bytes, { minLength: 3 }).map((r) => r.text)).toEqual([
      "hello",
    ]);
    // minLength 2 keeps both.
    expect(extractStrings(bytes, { minLength: 2 }).map((r) => r.text)).toEqual([
      "ab",
      "hello",
    ]);
    // minLength 6 keeps neither.
    expect(extractStrings(bytes, { minLength: 6 })).toEqual([]);
  });

  it("reports correct byte offsets", () => {
    const bytes = enc("\x00\x00code\x00more!!");
    const out = extractStrings(bytes, { minLength: 4 });
    expect(out).toEqual([
      { offset: 2, text: "code" },
      { offset: 7, text: "more!!" },
    ]);
  });

  it("keeps a run that reaches the end of the buffer", () => {
    const bytes = enc("\x01trailing");
    expect(extractStrings(bytes, { minLength: 4 })).toEqual([
      { offset: 1, text: "trailing" },
    ]);
  });

  it("extracts UTF-16LE strings as [printable, 0x00] pairs", () => {
    // "\x00\x00" prefix, then "Hi" as UTF-16LE: 48 00 69 00.
    const bytes = new Uint8Array([0x00, 0x00, 0x48, 0x00, 0x69, 0x00]);
    expect(
      extractStrings(bytes, { minLength: 2, encoding: "utf-16le" }),
    ).toEqual([{ offset: 2, text: "Hi" }]);
  });

  it("does not treat plain ASCII as UTF-16LE", () => {
    const bytes = enc("hello"); // no interleaved 0x00 bytes
    expect(
      extractStrings(bytes, { minLength: 4, encoding: "utf-16le" }),
    ).toEqual([]);
  });

  it("returns empty for empty input", () => {
    expect(extractStrings(new Uint8Array(0), { minLength: 4 })).toEqual([]);
  });

  it("formats lines with and without hex offsets", () => {
    const results = [{ offset: 4, text: "hello" }];
    expect(formatStrings(results, false)).toBe("hello");
    expect(formatStrings(results, true)).toBe("0x00000004  hello");
  });
});
