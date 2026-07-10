import { describe, expect, it } from "vitest";
import { decodeAsn1 } from "./logic";

describe("decodeAsn1", () => {
  it("decodes a SEQUENCE of INTEGER and NULL", () => {
    // 30 05 02 01 2A 05 00 → SEQUENCE { INTEGER 42, NULL }
    const r = decodeAsn1("300502012a0500");
    expect(r.error).toBe("");
    expect(r.tree?.type).toBe("SEQUENCE");
    expect(r.tree?.constructed).toBe(true);
    expect(r.tree?.children?.[0].type).toBe("INTEGER");
    expect(r.tree?.children?.[0].value).toBe("42");
    expect(r.tree?.children?.[1].type).toBe("NULL");
  });

  it("names a common OID", () => {
    // 30 05 06 03 55 04 03 → SEQUENCE { OID 2.5.4.3 }
    const oid = decodeAsn1("3005060355 0403".replace(/\s/g, "")).tree?.children?.[0];
    expect(oid?.type).toBe("OBJECT IDENTIFIER");
    expect(oid?.value).toMatch(/2\.5\.4\.3/);
    expect(oid?.value).toMatch(/commonName/);
  });

  it("accepts a PEM block", () => {
    const der = String.fromCharCode(0x30, 0x05, 0x02, 0x01, 0x2a, 0x05, 0x00);
    const pem = `-----BEGIN X-----\n${btoa(der)}\n-----END X-----`;
    expect(decodeAsn1(pem).tree?.type).toBe("SEQUENCE");
  });

  it("errors on non-ASN.1 bytes", () => {
    expect(decodeAsn1("ffffffff").error).not.toBe("");
  });

  it("is blank for empty input", () => {
    expect(decodeAsn1("   ")).toEqual({ error: "" });
  });
});
