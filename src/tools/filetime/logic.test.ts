import { describe, expect, it } from "vitest";
import { parseWindowsTime } from "./logic";

describe("parseWindowsTime", () => {
  it("converts a positive FILETIME to a date", () => {
    const r = parseWindowsTime("125911584000000000");
    expect(r.kind).toBe("timestamp");
    expect(r.iso).toBe("2000-01-01T00:00:00.000Z");
  });

  it("accepts 0x-hex input", () => {
    const hex = "0x" + (125911584000000000n).toString(16);
    const r = parseWindowsTime(hex);
    expect(r.kind).toBe("timestamp");
    expect(r.iso).toBe("2000-01-01T00:00:00.000Z");
  });

  it("ignores commas and whitespace", () => {
    const r = parseWindowsTime(" 125,911,584,000,000,000 ");
    expect(r.iso).toBe("2000-01-01T00:00:00.000Z");
  });

  it("converts a negative Integer8 to a duration (maxPwdAge = 42 days)", () => {
    const r = parseWindowsTime("-36288000000000");
    expect(r.kind).toBe("duration");
    expect(r.duration).toBe("42 days");
  });

  it("formats a sub-day duration (lockoutDuration = 30 minutes)", () => {
    const r = parseWindowsTime("-18000000000");
    expect(r.kind).toBe("duration");
    expect(r.duration).toBe("30 minutes");
  });

  it("handles the 0 sentinel", () => {
    const r = parseWindowsTime("0");
    expect(r.kind).toBe("special");
    expect(r.special).toMatch(/not set/);
  });

  it("handles the signed and unsigned max 'never' sentinels", () => {
    expect(parseWindowsTime("9223372036854775807").special).toMatch(/never/);
    expect(parseWindowsTime("18446744073709551615").special).toMatch(/never/);
  });

  it("handles the min sentinel", () => {
    expect(parseWindowsTime("-9223372036854775808").kind).toBe("special");
  });

  it("errors on non-integer input", () => {
    expect(parseWindowsTime("hello").error).not.toBe("");
  });

  it("returns empty for blank input", () => {
    expect(parseWindowsTime("  ").error).toBe("");
    expect(parseWindowsTime("  ").kind).toBe(null);
  });
});
