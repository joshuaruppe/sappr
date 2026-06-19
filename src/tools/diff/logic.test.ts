import { describe, expect, it } from "vitest";
import { computeDiff } from "./logic";

describe("diff", () => {
  it("reports removed and added lines", () => {
    const { parts, summary } = computeDiff("a\nb", "a\nc", "lines");
    expect(summary.added).toBeGreaterThan(0);
    expect(summary.removed).toBeGreaterThan(0);
    expect(parts.some((p) => p.removed && p.value.includes("b"))).toBe(true);
    expect(parts.some((p) => p.added && p.value.includes("c"))).toBe(true);
  });

  it("produces no adds or removes for identical inputs", () => {
    const { summary, parts } = computeDiff("same text", "same text", "lines");
    expect(summary.added).toBe(0);
    expect(summary.removed).toBe(0);
    expect(parts.every((p) => !p.added && !p.removed)).toBe(true);
  });

  it("diffs at word granularity", () => {
    const { parts } = computeDiff("the quick fox", "the slow fox", "words");
    expect(parts.some((p) => p.removed && p.value.includes("quick"))).toBe(true);
    expect(parts.some((p) => p.added && p.value.includes("slow"))).toBe(true);
  });

  it("diffs at char granularity", () => {
    const { summary } = computeDiff("cat", "car", "chars");
    expect(summary.added).toBe(1);
    expect(summary.removed).toBe(1);
  });

  it("treats empty inputs as no changes", () => {
    const { summary, parts } = computeDiff("", "", "lines");
    expect(summary.added).toBe(0);
    expect(summary.removed).toBe(0);
    expect(parts.length).toBe(0);
  });

  it("counts a pure addition", () => {
    const { summary } = computeDiff("", "hello", "lines");
    expect(summary.added).toBe(1);
    expect(summary.removed).toBe(0);
  });
});
