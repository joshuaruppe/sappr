import { describe, expect, it } from "vitest";
import { inspect, summarize } from "./logic";

describe("unicode inspect", () => {
  it("returns an empty array for empty input", () => {
    expect(inspect("")).toEqual([]);
  });

  it("describes a basic ASCII character", () => {
    const [info] = inspect("A");
    expect(info.codePoint).toBe(65);
    expect(info.hex).toBe("U+0041");
    expect(info.decimal).toBe(65);
    expect(info.utf8Bytes).toBe("41");
    expect(info.escapes.js).toBe("\\u0041");
    expect(info.escapes.html).toBe("&#x41;");
    expect(info.escapes.url).toBe("%41");
    expect(info.flags.nonAscii).toBe(false);
    expect(info.flags.zeroWidth).toBe(false);
  });

  it("treats an emoji (astral plane) as a single entry", () => {
    const rows = inspect("😀");
    expect(rows).toHaveLength(1);
    const [info] = rows;
    expect(info.codePoint).toBe(0x1f600);
    expect(info.hex).toBe("U+1F600");
    expect(info.char).toBe("😀");
    // Surrogate pair emitted for the JS escape.
    expect(info.escapes.js).toBe("\\uD83D\\uDE00");
    // 4 UTF-8 bytes.
    expect(info.utf8Bytes).toBe("F09F9880");
    expect(info.flags.nonAscii).toBe(true);
  });

  it("counts grapheme parts by code point, not UTF-16 units", () => {
    expect(inspect("a😀b")).toHaveLength(3);
  });

  it("flags a zero-width space and reports it in the summary", () => {
    const rows = inspect("a​b");
    expect(rows).toHaveLength(3);
    const zw = rows[1];
    expect(zw.codePoint).toBe(0x200b);
    expect(zw.hex).toBe("U+200B");
    expect(zw.flags.zeroWidth).toBe(true);
    expect(zw.flags.invisible).toBe(true);

    const summary = summarize("a​b");
    expect(summary.suspicious).toBe(1);
  });

  it("flags other invisible characters (bidi override, soft hyphen)", () => {
    const [rlo] = inspect("‮");
    expect(rlo.flags.zeroWidth).toBe(false);
    expect(rlo.flags.invisible).toBe(true);

    const [shy] = inspect("­");
    expect(shy.flags.invisible).toBe(true);
  });

  it("flags control characters", () => {
    const [info] = inspect("");
    expect(info.flags.control).toBe(true);
    expect(info.hex).toBe("U+0007");
  });

  it("flags combining marks", () => {
    // Combining acute accent.
    const [info] = inspect("́");
    expect(info.flags.combining).toBe(true);
    expect(info.flags.nonAscii).toBe(true);
  });

  it("summarizes chars, code points and bytes", () => {
    const s = "héllo 🌍";
    const summary = summarize(s);
    expect(summary.chars).toBe(s.length); // UTF-16 code units
    expect(summary.codePoints).toBe(inspect(s).length);
    expect(summary.bytes).toBe(new TextEncoder().encode(s).length);
    expect(summary.suspicious).toBe(0);
  });

  it("returns a zeroed summary for empty input", () => {
    expect(summarize("")).toEqual({
      chars: 0,
      codePoints: 0,
      bytes: 0,
      suspicious: 0,
    });
  });
});
