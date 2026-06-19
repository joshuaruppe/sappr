import { describe, expect, it } from "vitest";
import { decodeJwt, formatUtc } from "./logic";

// Standard RFC 7519 example token (HS256), payload has sub/name/iat.
const HS256 =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("decodeJwt", () => {
  it("decodes a known HS256 header", () => {
    const out = decodeJwt(HS256);
    expect(out.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(out.alg).toBe("HS256");
    expect(out.typ).toBe("JWT");
  });

  it("decodes the payload fields", () => {
    const out = decodeJwt(HS256);
    expect(out.payload).toEqual({
      sub: "1234567890",
      name: "John Doe",
      iat: 1516239022,
    });
  });

  it("surfaces time claims as raw + UTC", () => {
    const out = decodeJwt(HS256);
    const iat = out.timeClaims.find((c) => c.key === "iat");
    expect(iat).toBeDefined();
    expect(iat?.raw).toBe(1516239022);
    expect(iat?.utc).toBe(formatUtc(1516239022));
  });

  it("pretty-prints header and payload JSON", () => {
    const out = decodeJwt(HS256);
    expect(out.headerJson).toContain('"alg": "HS256"');
    expect(out.payloadJson).toContain('"name": "John Doe"');
  });

  it("reports expired tokens against now", () => {
    // exp in the past relative to a fixed 'now'.
    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ exp: 1000 }));
    const token = `${header}.${payload}.sig`;
    const out = decodeJwt(token, 2000 * 1000);
    expect(out.expiry).toBe("expired");
  });

  it("reports valid tokens whose exp is in the future", () => {
    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ exp: 5000 }));
    const token = `${header}.${payload}.sig`;
    const out = decodeJwt(token, 1000 * 1000);
    expect(out.expiry).toBe("valid");
  });

  it("reports not-yet-valid when nbf is in the future", () => {
    const header = btoa(JSON.stringify({ alg: "none" }));
    const payload = btoa(JSON.stringify({ nbf: 9000, exp: 10000 }));
    const token = `${header}.${payload}.sig`;
    const out = decodeJwt(token, 1000 * 1000);
    expect(out.expiry).toBe("not-yet-valid");
  });

  it("reports unknown expiry when no exp/nbf present", () => {
    const out = decodeJwt(HS256);
    expect(out.expiry).toBe("unknown");
  });

  it("throws on a token without three parts", () => {
    expect(() => decodeJwt("only.two")).toThrow();
    expect(() => decodeJwt("a.b.c.d")).toThrow();
  });

  it("throws on empty segments", () => {
    expect(() => decodeJwt("a..c")).toThrow();
  });

  it("throws on a segment that is not valid JSON", () => {
    const bad = `${btoa("not json")}.${btoa("{}")}.sig`;
    expect(() => decodeJwt(bad)).toThrow();
  });

  it("throws on an empty token", () => {
    expect(() => decodeJwt("")).toThrow();
    expect(() => decodeJwt("   ")).toThrow();
  });
});
