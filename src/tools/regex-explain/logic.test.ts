import { describe, expect, it } from "vitest";
import { explainRegex, type ExplainNode } from "./logic";

/** Collect every label + detail in the tree into one searchable string. */
function flatten(node: ExplainNode): string {
  const self = `${node.label} ${node.detail ?? ""}`;
  const kids = (node.children ?? []).map(flatten).join(" ");
  return `${self} ${kids}`;
}

describe("regex-explain", () => {
  it("describes a+ as the char 'a' repeated one or more times", () => {
    const { tree, error } = explainRegex("a+", "");
    expect(error).toBeUndefined();
    expect(tree).toBeDefined();
    const text = flatten(tree!);
    expect(text).toContain("one or more");
    expect(text).toContain('"a"');
  });

  it("describes [A-Z]\\d as a character class A-Z plus a digit", () => {
    const { tree, error } = explainRegex("[A-Z]\\d", "");
    expect(error).toBeUndefined();
    const text = flatten(tree!);
    expect(text.toLowerCase()).toContain("character class");
    expect(text).toContain("A-Z");
    expect(text).toContain("digit");
  });

  it("explains groups, alternation and lookahead", () => {
    const { tree } = explainRegex("(?<year>\\d{4})|(?=foo)", "");
    const text = flatten(tree!);
    expect(text).toContain("Alternation");
    expect(text).toContain("year");
    expect(text).toContain("Lookahead");
  });

  it("explains anchors and word boundaries", () => {
    const { tree } = explainRegex("^\\bword$", "");
    const text = flatten(tree!);
    expect(text).toContain("start of input");
    expect(text).toContain("word boundary");
    expect(text).toContain("end of input");
  });

  it("returns an error for an invalid pattern", () => {
    const { error, tree } = explainRegex("(", "");
    expect(error).toBeTruthy();
    expect(tree).toBeUndefined();
  });

  it("returns an empty result for empty input (no error)", () => {
    const result = explainRegex("", "");
    expect(result.tree).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it("reports flags at the root", () => {
    const { tree } = explainRegex("a", "gi");
    expect(tree!.detail).toContain("g");
    expect(tree!.detail).toContain("i");
  });
});
