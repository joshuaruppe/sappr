import { describe, expect, it } from "vitest";
import { convert, parseAny, stringifyAny } from "./logic";

describe("data-convert", () => {
  it("round-trips JSON -> YAML -> JSON (deep equal)", () => {
    const json = '{"a":1,"b":[1,2]}';
    const yaml = convert(json, "json", "yaml");
    const back = convert(yaml, "yaml", "json");
    expect(JSON.parse(back)).toEqual({ a: 1, b: [1, 2] });
  });

  it("rejects nested values when converting to CSV (no silent corruption)", () => {
    // Regression: a nested object used to slip past the guard and emit the
    // literal "[object Object]" instead of erroring.
    expect(() => convert('[{"a":{"x":1}}]', "json", "csv")).toThrow(/flat/i);
    expect(() => convert('[{"a":[1,2]}]', "json", "csv")).toThrow(/flat/i);
  });

  it("still converts a flat array of objects to CSV", () => {
    const out = convert('[{"a":1,"b":"two"}]', "json", "csv");
    expect(out).toContain("a,b");
    expect(out).toContain("1,two");
  });

  it("parses CSV to an array of row objects", () => {
    const value = parseAny("a,b\n1,2", "csv");
    expect(value).toEqual([{ a: "1", b: "2" }]);
  });

  it("converts a JSON object to TOML containing scalar assignments", () => {
    const toml = convert('{"a":1,"b":"x"}', "json", "toml");
    expect(toml).toContain("a = 1");
    expect(toml).toContain('b = "x"');
  });

  it("throws when converting a bare JSON array to TOML", () => {
    expect(() => convert("[1,2,3]", "json", "toml")).toThrow();
  });

  it("throws when converting a non-array value to CSV", () => {
    expect(() => stringifyAny({ a: 1 }, "csv")).toThrow();
  });

  it("round-trips a tabular array JSON -> CSV -> JSON", () => {
    const rows = '[{"a":"1","b":"2"},{"a":"3","b":"4"}]';
    const csv = convert(rows, "json", "csv");
    const back = parseAny(csv, "csv");
    expect(back).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("returns empty output for empty/whitespace input", () => {
    expect(convert("", "json", "yaml")).toBe("");
    expect(convert("   \n  ", "json", "toml")).toBe("");
  });

  it("surfaces invalid JSON as a thrown error", () => {
    expect(() => convert("{not json", "json", "yaml")).toThrow();
  });
});
