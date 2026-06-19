import { describe, expect, it } from "vitest";
import { formatJson } from "./logic";

describe("formatJson", () => {
  it("returns empty string for empty/whitespace input", () => {
    expect(formatJson("")).toBe("");
    expect(formatJson("   \n ")).toBe("");
  });

  it("beautifies with 2-space indent by default", () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}');
  });

  it("beautifies with 4-space indent", () => {
    expect(formatJson('{"a":1}', { indent: "4" })).toBe('{\n    "a": 1\n}');
  });

  it("beautifies with tab indent", () => {
    expect(formatJson('{"a":1}', { indent: "tab" })).toBe('{\n\t"a": 1\n}');
  });

  it("minifies, stripping all insignificant whitespace", () => {
    expect(formatJson('{\n  "a": 1,\n  "b": [1, 2]\n}', { minify: true })).toBe(
      '{"a":1,"b":[1,2]}',
    );
  });

  it("sorts keys recursively when sortKeys is set", () => {
    const input = '{"b":1,"a":{"d":4,"c":3}}';
    expect(formatJson(input, { minify: true, sortKeys: true })).toBe(
      '{"a":{"c":3,"d":4},"b":1}',
    );
  });

  it("does not reorder keys when sortKeys is off", () => {
    expect(formatJson('{"b":1,"a":2}', { minify: true })).toBe('{"b":1,"a":2}');
  });

  it("sorts keys inside arrays of objects", () => {
    const input = '[{"y":1,"x":2}]';
    expect(formatJson(input, { minify: true, sortKeys: true })).toBe(
      '[{"x":2,"y":1}]',
    );
  });

  it("throws a helpful error on invalid JSON", () => {
    expect(() => formatJson("{ not valid }")).toThrow(/Invalid JSON/);
  });

  it("throws on truncated JSON", () => {
    expect(() => formatJson('{"a":')).toThrow(/Invalid JSON/);
  });

  it("handles primitives and nested structures", () => {
    expect(formatJson("[1,2,3]", { minify: true })).toBe("[1,2,3]");
    expect(formatJson("null")).toBe("null");
    expect(formatJson('"text"')).toBe('"text"');
  });
});
