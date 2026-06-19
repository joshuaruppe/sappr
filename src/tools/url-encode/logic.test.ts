import { describe, expect, it } from "vitest";
import { encodeUrl, decodeUrl } from "./logic";

describe("url-encode", () => {
  it("returns empty string for empty input", () => {
    expect(encodeUrl("")).toBe("");
    expect(decodeUrl("")).toBe("");
  });

  it("encodes component scope (escapes reserved chars)", () => {
    expect(encodeUrl("a b&c=d?e", { scope: "component" })).toBe(
      "a%20b%26c%3Dd%3Fe",
    );
    expect(decodeUrl("a%20b%26c%3Dd%3Fe", { scope: "component" })).toBe(
      "a b&c=d?e",
    );
  });

  it("encodes full URI scope (preserves reserved chars)", () => {
    expect(encodeUrl("https://x.io/p?a=b c&d", { scope: "full" })).toBe(
      "https://x.io/p?a=b%20c&d",
    );
    expect(decodeUrl("https://x.io/p?a=b%20c&d", { scope: "full" })).toBe(
      "https://x.io/p?a=b c&d",
    );
  });

  it("full vs component differ on reserved characters", () => {
    const s = "a=b&c";
    expect(encodeUrl(s, { scope: "component" })).toBe("a%3Db%26c");
    expect(encodeUrl(s, { scope: "full" })).toBe("a=b&c");
  });

  it("plus mode replaces %20 with + on encode", () => {
    expect(encodeUrl("a b c", { plus: true })).toBe("a+b+c");
    expect(encodeUrl("a b c", { plus: false })).toBe("a%20b%20c");
  });

  it("plus mode treats + as space on decode", () => {
    expect(decodeUrl("a+b+c", { plus: true })).toBe("a b c");
    expect(decodeUrl("a+b+c", { plus: false })).toBe("a+b+c");
  });

  it("plus mode round-trips form values", () => {
    const s = "hello world & goodbye";
    const enc = encodeUrl(s, { scope: "component", plus: true });
    expect(enc).toBe("hello+world+%26+goodbye");
    expect(decodeUrl(enc, { scope: "component", plus: true })).toBe(s);
  });

  it("throws on malformed percent-encoding when decoding", () => {
    expect(() => decodeUrl("%E0%A4%A", { scope: "component" })).toThrow();
    expect(() => decodeUrl("%E0%A4%A", { scope: "full" })).toThrow();
  });
});
