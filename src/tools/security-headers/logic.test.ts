import { describe, expect, it } from "vitest";
import { analyzeHeaders } from "./logic";

describe("analyzeHeaders", () => {
  it("parses headers and skips the status line", () => {
    const r = analyzeHeaders("HTTP/1.1 200 OK\nContent-Type: text/html\nServer: nginx");
    expect(r.headers).toHaveLength(2);
    expect(r.headers[0]).toEqual({ name: "Content-Type", value: "text/html" });
  });

  it("flags a missing CSP as high", () => {
    const r = analyzeHeaders("Content-Type: text/html");
    expect(r.findings.some((f) => f.severity === "high" && /Content-Security-Policy/.test(f.message))).toBe(true);
  });

  it("flags unsafe-inline in the CSP", () => {
    const r = analyzeHeaders("Content-Security-Policy: script-src 'self' 'unsafe-inline'");
    expect(r.findings.some((f) => f.severity === "high" && /unsafe-inline/.test(f.message))).toBe(true);
  });

  it("flags a wildcard script source", () => {
    const r = analyzeHeaders("Content-Security-Policy: default-src 'self'; script-src *");
    expect(r.findings.some((f) => f.severity === "high" && /wildcard/.test(f.message))).toBe(true);
  });

  it("flags a missing HSTS header", () => {
    const r = analyzeHeaders("Content-Security-Policy: default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    expect(r.findings.some((f) => f.severity === "medium" && /HSTS/.test(f.message))).toBe(true);
  });

  it("flags a cookie missing HttpOnly and Secure", () => {
    const r = analyzeHeaders("Set-Cookie: SID=abc; Path=/");
    expect(r.findings.some((f) => /missing HttpOnly/.test(f.message))).toBe(true);
    expect(r.findings.some((f) => /missing Secure/.test(f.message))).toBe(true);
  });

  it("does not flag a well-configured cookie", () => {
    const r = analyzeHeaders("Set-Cookie: SID=abc; Path=/; HttpOnly; Secure; SameSite=Strict");
    expect(r.findings.some((f) => /SID/.test(f.message))).toBe(false);
  });

  it("flags version-disclosing Server / X-Powered-By", () => {
    const r = analyzeHeaders("Server: Apache/2.4.41\nX-Powered-By: PHP/7.4");
    expect(r.findings.some((f) => /discloses/.test(f.message))).toBe(true);
    expect(r.findings.some((f) => /X-Powered-By/.test(f.message))).toBe(true);
  });

  it("errors when no headers parse", () => {
    expect(analyzeHeaders("just some prose").error).not.toBe("");
  });
});
