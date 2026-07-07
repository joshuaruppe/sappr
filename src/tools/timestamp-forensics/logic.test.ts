import { describe, expect, it } from "vitest";
import { decodeTimestamp } from "./logic";

function find(input: string, re: RegExp) {
  return decodeTimestamp(input).interpretations.find((i) => re.test(i.format));
}

describe("decodeTimestamp", () => {
  it("decodes Unix seconds", () => {
    const i = find("1700000000", /Unix seconds/);
    expect(i?.utc).toBe("2023-11-14T22:13:20.000Z");
    expect(i?.likely).toBe(true);
  });

  it("decodes a Windows FILETIME", () => {
    expect(find("125911584000000000", /FILETIME/)?.utc).toBe("2000-01-01T00:00:00.000Z");
  });

  it("decodes a Chrome/WebKit timestamp", () => {
    expect(find("12591158400000000", /Chrome/)?.utc).toBe("2000-01-01T00:00:00.000Z");
  });

  it("decodes a packed DOS date/time", () => {
    // 0x48210000 packs 2016-01-01 00:00:00 (year 36 since 1980, month 1, day 1).
    expect(find("1210122240", /DOS/)?.utc).toBe("2016-01-01T00:00:00.000Z");
  });

  it("accepts 0x-hex input", () => {
    // 0x655324C0 = 1699969216 → Unix seconds in Nov 2023.
    const i = find("0x655324C0", /Unix seconds/);
    expect(i?.utc?.startsWith("2023-11-")).toBe(true);
  });

  it("surfaces multiple plausible interpretations", () => {
    expect(decodeTimestamp("1700000000").interpretations.length).toBeGreaterThan(1);
  });

  it("errors on non-numeric input", () => {
    expect(decodeTimestamp("not a number").error).not.toBe("");
  });

  it("is blank for empty input", () => {
    expect(decodeTimestamp("   ")).toEqual({ interpretations: [], error: "" });
  });
});
