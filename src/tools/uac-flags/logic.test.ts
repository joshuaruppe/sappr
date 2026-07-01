import { describe, it, expect } from "vitest";
import { parseUac } from "./logic";

describe("userAccountControl decoder", () => {
  it("decodes a normal, non-expiring account (66048)", () => {
    const r = parseUac("66048"); // 0x10200
    expect(r.error).toBe("");
    const names = r.flags.map((f) => f.name);
    expect(names).toContain("NORMAL_ACCOUNT");
    expect(names).toContain("DONT_EXPIRE_PASSWORD");
  });

  it("flags AS-REP roastable and unconstrained delegation (hex)", () => {
    const names = parseUac("0x480200").flags.map((f) => f.name);
    expect(names).toContain("DONT_REQ_PREAUTH");
    expect(names).toContain("TRUSTED_FOR_DELEGATION");
    expect(names).toContain("NORMAL_ACCOUNT");
  });

  it("errors on non-numeric input", () => {
    expect(parseUac("abc").error).not.toBe("");
  });

  it("is blank for empty input", () => {
    expect(parseUac("  ")).toMatchObject({ value: null, error: "" });
  });
});
