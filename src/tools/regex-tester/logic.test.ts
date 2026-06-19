import { describe, expect, it } from "vitest";
import { runRegex } from "./logic";

describe("regex-tester", () => {
  it("finds all matches with numbered groups", () => {
    const { matches, error } = runRegex("(\\d+)", "g", "a1b22");
    expect(error).toBeUndefined();
    expect(matches).toHaveLength(2);
    expect(matches[0].match).toBe("1");
    expect(matches[0].index).toBe(1);
    expect(matches[0].groups).toEqual(["1"]);
    expect(matches[1].match).toBe("22");
    expect(matches[1].index).toBe(3);
    expect(matches[1].groups).toEqual(["22"]);
  });

  it("returns an error for an invalid pattern", () => {
    const { matches, error } = runRegex("(", "", "abc");
    expect(matches).toEqual([]);
    expect(error).toBeTruthy();
  });

  it("returns the first match only without the global flag", () => {
    const { matches } = runRegex("\\d", "", "a1b2");
    expect(matches).toHaveLength(1);
    expect(matches[0].match).toBe("1");
  });

  it("captures named groups", () => {
    const { matches } = runRegex("(?<year>\\d{4})", "g", "2021 2026");
    expect(matches).toHaveLength(2);
    expect(matches[0].namedGroups).toEqual({ year: "2021" });
    expect(matches[1].namedGroups).toEqual({ year: "2026" });
  });

  it("respects the case-insensitive flag", () => {
    const { matches } = runRegex("a", "gi", "AaA");
    expect(matches).toHaveLength(3);
  });

  it("does not infinite-loop on zero-length matches", () => {
    const { matches } = runRegex("a*", "g", "abc");
    // Should terminate and produce a finite list.
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].match).toBe("a");
  });

  it("terminates on zero-width matches under the unicode flag with astral input", () => {
    // Regression: advancing lastIndex by one code unit could land mid-surrogate
    // under `u` and loop forever, hanging the tab. It must step a full code
    // point and finish, matching native String.matchAll.
    const text = "a😀b"; // 😀 is a surrogate pair (2 UTF-16 code units)
    const { matches, error } = runRegex("a*", "gu", text);
    expect(error).toBeUndefined();
    expect(matches.length).toBe([...text.matchAll(/a*/gu)].length);
    expect(matches[0].match).toBe("a");
  });

  it("returns no matches and no error for empty pattern", () => {
    const { matches, error } = runRegex("", "g", "abc");
    expect(matches).toEqual([]);
    expect(error).toBeUndefined();
  });

  it("returns no matches for empty text", () => {
    const { matches, error } = runRegex("\\d", "g", "");
    expect(matches).toEqual([]);
    expect(error).toBeUndefined();
  });

  it("leaves undefined for optional unmatched groups", () => {
    const { matches } = runRegex("(a)(b)?", "g", "a");
    expect(matches[0].groups).toEqual(["a", undefined]);
  });
});
