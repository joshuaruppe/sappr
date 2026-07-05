import { describe, expect, it } from "vitest";
import { decodeSaml, encodeSaml, prettyXml } from "./logic";

const XML =
  '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_abc" Version="2.0"><saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">https://sp.example.com</saml:Issuer></samlp:AuthnRequest>';

function toB64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

describe("decodeSaml", () => {
  it("decodes a plain Base64 (HTTP-POST) message", async () => {
    const r = await decodeSaml(toB64(XML));
    expect(r.error).toBe("");
    expect(r.binding).toMatch(/POST/);
    expect(r.xml).toMatch(/AuthnRequest/);
    expect(r.xml).toMatch(/sp\.example\.com/);
  });

  it("URL-decodes before Base64", async () => {
    const r = await decodeSaml(encodeURIComponent(toB64(XML)));
    expect(r.binding).toMatch(/POST/);
    expect(r.xml).toMatch(/AuthnRequest/);
  });

  it("errors on non-Base64 input", async () => {
    const r = await decodeSaml("!!! not base64 !!!");
    expect(r.error).not.toBe("");
  });

  it("decodes Base64 XML with a leading UTF-8 BOM", async () => {
    const r = await decodeSaml(toB64(`﻿${XML}`));
    expect(r.error).toBe("");
    expect(r.binding).toMatch(/POST/);
    expect(r.xml).toMatch(/AuthnRequest/);
  });

  it("returns empty for blank input", async () => {
    expect((await decodeSaml("   ")).error).toBe("");
  });
});

describe("encodeSaml + round-trip", () => {
  it("produces a POST (Base64) form that decodes back", async () => {
    const enc = await encodeSaml(XML);
    expect(enc.error).toBe("");
    const back = await decodeSaml(enc.post);
    expect(back.xml).toMatch(/AuthnRequest/);
  });

  it.skipIf(typeof CompressionStream === "undefined")(
    "round-trips the DEFLATE (Redirect) form",
    async () => {
      const enc = await encodeSaml(XML);
      const back = await decodeSaml(enc.redirect);
      expect(back.binding).toMatch(/Redirect/);
      expect(back.xml).toMatch(/sp\.example\.com/);
    },
  );
});

describe("prettyXml", () => {
  it("indents nested elements", () => {
    const out = prettyXml("<a><b>x</b></a>");
    expect(out).toBe("<a>\n  <b>x</b>\n</a>");
  });

  it("keeps an empty paired element on one line", () => {
    expect(prettyXml("<r><a></a></r>")).toBe("<r>\n  <a></a>\n</r>");
  });
});
