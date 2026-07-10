import { describe, expect, it } from "vitest";
import { analyzeEntropy } from "./logic";

describe("analyzeEntropy", () => {
  it("reports zero entropy for all-zero data", () => {
    const r = analyzeEntropy(new Uint8Array(1000));
    expect(r.overall).toBe(0);
    expect(r.verdict).toMatch(/Low/);
  });

  it("reports maximum entropy for a uniform byte distribution", () => {
    const b = new Uint8Array(2560);
    for (let i = 0; i < b.length; i++) b[i] = i % 256; // each value appears 10× → 8 bits
    const r = analyzeEntropy(b);
    expect(r.overall).toBe(8);
    expect(r.verdict).toMatch(/Very high/);
    expect(r.findings.some((f) => /packed/.test(f.message))).toBe(true);
  });

  it("builds a block series and a 256-bin histogram", () => {
    const r = analyzeEntropy(new Uint8Array(5000));
    expect(r.histogram).toHaveLength(256);
    expect(r.blocks.length).toBeGreaterThan(0);
  });

  it("is blank for empty input", () => {
    expect(analyzeEntropy(new Uint8Array(0)).size).toBe(0);
  });
});
