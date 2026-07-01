import { describe, it, expect } from "vitest";
import { parseFiletime } from "./logic";

describe("Windows FILETIME converter", () => {
  it("converts a FILETIME to UTC (2000-01-01)", () => {
    // 2000-01-01T00:00:00Z as FILETIME
    expect(parseFiletime("125911584000000000").iso).toBe("2000-01-01T00:00:00.000Z");
  });

  it("accepts hex input", () => {
    // 0x100 = 256 hundred-ns ticks after 1601-01-01
    const r = parseFiletime("0x100");
    expect(r.error).toBe("");
    expect(r.iso).toMatch(/^1601-01-01/);
  });

  it("recognizes the never/max sentinels", () => {
    expect(parseFiletime("0").special).toMatch(/never/i);
    expect(parseFiletime("9223372036854775807").special).toMatch(/never/i);
  });

  it("errors on junk", () => {
    expect(parseFiletime("nope").error).not.toBe("");
  });
});
