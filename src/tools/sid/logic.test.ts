import { describe, expect, it } from "vitest";
import { parseSid } from "./logic";

describe("parseSid", () => {
  it("decodes a domain SID and resolves the RID", () => {
    const r = parseSid("S-1-5-21-1004336348-1177238915-682003330-512");
    expect(r.format).toBe("string");
    expect(r.authority).toBe("5");
    expect(r.authorityName).toBe("NT Authority");
    expect(r.rid).toBe(512);
    expect(r.ridName).toMatch(/Domain Admins/);
    expect(r.name).toBe("Domain Admins");
    expect(r.domainSid).toBe("S-1-5-21-1004336348-1177238915-682003330");
  });

  it("resolves a BUILTIN alias SID", () => {
    const r = parseSid("S-1-5-32-544");
    expect(r.name).toBe("BUILTIN\\Administrators");
    expect(r.rid).toBe(544);
  });

  it("resolves a well-known fixed SID", () => {
    expect(parseSid("S-1-5-18").name).toBe("NT AUTHORITY\\SYSTEM");
  });

  it("labels a normal user RID (>= 1000) as a created object", () => {
    const r = parseSid("S-1-5-21-1-2-3-1105");
    expect(r.rid).toBe(1105);
    expect(r.ridName).toMatch(/created object/);
    expect(r.name).toBeUndefined();
  });

  it("emits the binary form for a string SID", () => {
    const r = parseSid("S-1-1-0");
    expect(r.binaryHex.replace(/ /g, "")).toBe("010100000000000100000000");
  });

  it("decodes a binary SID (hex) back to string", () => {
    const r = parseSid("01 01 00 00 00 00 00 01 00 00 00 00");
    expect(r.format).toBe("binary");
    expect(r.sid).toBe("S-1-1-0");
    expect(r.name).toBe("Everyone");
  });

  it("round-trips string -> binary -> string", () => {
    const sid = "S-1-5-32-544";
    const bin = parseSid(sid).binaryHex;
    expect(parseSid(bin).sid).toBe(sid);
  });

  it("decodes a base64 binary SID", () => {
    // S-1-1-0 as base64 of its 12 binary bytes.
    const b64 = btoa(String.fromCharCode(1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0));
    expect(parseSid(b64).sid).toBe("S-1-1-0");
  });

  it("errors on nonsense input", () => {
    expect(parseSid("not a sid").error).not.toBe("");
  });

  it("returns empty for blank input", () => {
    expect(parseSid("   ").error).toBe("");
    expect(parseSid("").sid).toBe("");
  });
});
