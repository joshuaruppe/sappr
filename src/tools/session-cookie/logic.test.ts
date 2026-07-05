import { describe, expect, it } from "vitest";
import { decodeCookie } from "./logic";

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("decodeCookie", () => {
  it("decodes a Flask / itsdangerous cookie", async () => {
    const cookie = `${b64url('{"user":"admin","admin":true}')}.aBcDeF.${b64url("signature")}`;
    const r = await decodeCookie(cookie);
    expect(r.type).toBe("flask");
    expect(r.payload).toMatch(/"admin": true/);
    expect(r.findings.some((f) => /not encrypted/.test(f.message))).toBe(true);
  });

  it("detects a JWT stored in a cookie", async () => {
    const cookie = `${b64url('{"alg":"HS256","typ":"JWT"}')}.${b64url('{"sub":"1"}')}.sig`;
    const r = await decodeCookie(cookie);
    expect(r.type).toBe("jwt");
    expect(r.header).toMatch(/HS256/);
  });

  it("flags a JWT with alg:none as high", async () => {
    const cookie = `${b64url('{"alg":"none"}')}.${b64url('{"admin":true}')}.`;
    const r = await decodeCookie(cookie);
    expect(r.findings.some((f) => f.severity === "high" && /alg: none/.test(f.message))).toBe(true);
  });

  it("decodes a Django signed value", async () => {
    const cookie = `${b64url('{"msg":"hi"}')}:1abc:someSignature`;
    const r = await decodeCookie(cookie);
    expect(r.type).toBe("django");
    expect(r.payload).toMatch(/"msg": "hi"/);
  });

  it("strips a leading cookiename= prefix", async () => {
    const cookie = `session=${b64url('{"user":"x"}')}.aBcDeF.${b64url("sig")}`;
    const r = await decodeCookie(cookie);
    expect(r.type).toBe("flask");
    expect(r.payload).toMatch(/"user": "x"/);
  });

  it("falls back to plain Base64", async () => {
    const r = await decodeCookie(b64url('{"hello":"world"}'));
    expect(r.type).toBe("base64");
    expect(r.payload).toMatch(/"hello": "world"/);
  });

  it("keeps a JWT with a malformed payload labeled as JWT, not Flask", async () => {
    const cookie = `${b64url('{"alg":"HS256","typ":"JWT"}')}.@@@notbase64@@@.sig`;
    const r = await decodeCookie(cookie);
    expect(r.type).toBe("jwt");
    expect(r.findings.some((f) => /malformed or truncated/.test(f.message))).toBe(true);
  });

  it("does not label an arbitrary a:b:c value as Django", async () => {
    const r = await decodeCookie("YWJj:100:200");
    expect(r.type).not.toBe("django");
  });

  it("errors on unrecognizable input", async () => {
    const r = await decodeCookie("@@@ not a cookie @@@");
    expect(r.error).not.toBe("");
  });
});
