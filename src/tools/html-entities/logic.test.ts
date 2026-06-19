import { describe, expect, it } from "vitest";
import { encodeHtmlEntities, decodeHtmlEntities } from "./logic";

describe("html-entities", () => {
  it("encodes unsafe characters", () => {
    const out = encodeHtmlEntities("<a> & 'b'");
    expect(out).toContain("&lt;");
    expect(out).toContain("&gt;");
    expect(out).toContain("&amp;");
    // Default uses named references, so the apostrophe is &apos; (not numeric).
    expect(out).toContain("&apos;");
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
  });

  it("uses named references when enabled", () => {
    const out = encodeHtmlEntities("<a> & 'b'", { useNamedReferences: true });
    expect(out).toContain("&lt;");
    expect(out).toContain("&amp;");
  });

  it("decodes named and numeric entities", () => {
    expect(decodeHtmlEntities("&amp;")).toBe("&");
    expect(decodeHtmlEntities("&lt;")).toBe("<");
    expect(decodeHtmlEntities("&#x27;")).toBe("'");
  });

  it("round-trips through encode then decode", () => {
    const s = "<a> & 'b'";
    expect(decodeHtmlEntities(encodeHtmlEntities(s))).toBe(s);
    expect(
      decodeHtmlEntities(encodeHtmlEntities(s, { useNamedReferences: true })),
    ).toBe(s);
  });

  it("encodes everything when enabled", () => {
    const out = encodeHtmlEntities("ab", { encodeEverything: true });
    expect(out).not.toContain("a");
    expect(out).not.toContain("b");
    expect(decodeHtmlEntities(out)).toBe("ab");
  });

  it("returns empty string for empty input", () => {
    expect(encodeHtmlEntities("")).toBe("");
    expect(decodeHtmlEntities("")).toBe("");
  });
});
