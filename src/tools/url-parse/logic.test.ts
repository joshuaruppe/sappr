import { describe, expect, it } from "vitest";
import { parseUrl, normalizeUrlInput } from "./logic";

describe("url-parse", () => {
  it("breaks a full URL into its parts", () => {
    const r = parseUrl(
      "https://u:p@host.com:8443/a/b?x=1&y=two%20words#frag",
    );
    expect(r.protocol).toBe("https:");
    expect(r.username).toBe("u");
    expect(r.password).toBe("p");
    expect(r.hostname).toBe("host.com");
    expect(r.port).toBe("8443");
    expect(r.host).toBe("host.com:8443");
    expect(r.pathname).toBe("/a/b");
    expect(r.hash).toBe("#frag");
    expect(r.origin).toBe("https://host.com:8443");
  });

  it("decodes query parameter values", () => {
    const r = parseUrl(
      "https://u:p@host.com:8443/a/b?x=1&y=two%20words#frag",
    );
    expect(r.params).toEqual([
      { key: "x", value: "1" },
      { key: "y", value: "two words" },
    ]);
  });

  it("returns an empty params list when there is no query", () => {
    const r = parseUrl("https://example.com/path");
    expect(r.params).toEqual([]);
    expect(r.search).toBe("");
  });

  it("handles scheme-less host-like input by prefixing https://", () => {
    const r = parseUrl("example.com/foo?a=b");
    expect(r.protocol).toBe("https:");
    expect(r.hostname).toBe("example.com");
    expect(r.pathname).toBe("/foo");
    expect(r.params).toEqual([{ key: "a", value: "b" }]);
  });

  it("handles protocol-relative input", () => {
    const r = parseUrl("//cdn.example.com/lib.js");
    expect(r.protocol).toBe("https:");
    expect(r.hostname).toBe("cdn.example.com");
    expect(r.pathname).toBe("/lib.js");
  });

  it("leaves existing schemes untouched in normalization", () => {
    expect(normalizeUrlInput("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(normalizeUrlInput("ftp://host/x")).toBe("ftp://host/x");
  });

  it("throws on an invalid URL", () => {
    expect(() => parseUrl("ht!tp://::::")).toThrow();
  });
});
