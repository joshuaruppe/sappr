import { describe, expect, it } from "vitest";
import { formatSql } from "./logic";

describe("sql-format", () => {
  it("uppercases keywords and adds newlines", () => {
    const out = formatSql("select a,b from t where a=1");
    expect(out).toContain("SELECT");
    expect(out).toContain("FROM");
    expect(out).toContain("WHERE");
    expect(out.split("\n").length).toBeGreaterThan(1);
  });

  it("lowercases keywords when requested", () => {
    const out = formatSql("SELECT A FROM T", { keywordCase: "lower" });
    expect(out).toContain("select");
    expect(out).toContain("from");
  });

  it("honors tabWidth", () => {
    const two = formatSql("select a,b from t", { tabWidth: 2 });
    const four = formatSql("select a,b from t", { tabWidth: 4 });
    expect(four.length).toBeGreaterThanOrEqual(two.length);
  });

  it("returns empty string for empty input", () => {
    expect(formatSql("")).toBe("");
    expect(formatSql("   \n ")).toBe("");
  });

  it("throws on malformed SQL", () => {
    expect(() => formatSql("SELECT ((((")).toThrow();
  });
});
