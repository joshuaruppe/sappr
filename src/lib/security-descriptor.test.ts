import { describe, it, expect } from "vitest";
import {
  parseSecurityDescriptor,
  toSddl,
  decodeRights,
  rightsSddl,
  sddlSid,
  wellKnownSidName,
  guidName,
} from "./security-descriptor";

// A known self-relative SECURITY_DESCRIPTOR, byte-for-byte:
//   Owner = SYSTEM (S-1-5-18), Group = SYSTEM,
//   DACL present with one ACE: Allow GENERIC_ALL to Everyone (S-1-1-0).
// Equivalent SDDL: O:SYG:SYD:(A;;GA;;;WD)
const SD = new Uint8Array([
  // header: rev, sbz1, control=0x8004 (self-relative + DACL present)
  0x01, 0x00, 0x04, 0x80,
  0x14, 0x00, 0x00, 0x00, // OffsetOwner = 20
  0x20, 0x00, 0x00, 0x00, // OffsetGroup = 32
  0x00, 0x00, 0x00, 0x00, // OffsetSacl  = 0
  0x2c, 0x00, 0x00, 0x00, // OffsetDacl  = 44
  // owner SID @20: S-1-5-18
  0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x05, 0x12, 0x00, 0x00, 0x00,
  // group SID @32: S-1-5-18
  0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x05, 0x12, 0x00, 0x00, 0x00,
  // DACL header @44: rev=2, size=0x1c, aceCount=1
  0x02, 0x00, 0x1c, 0x00, 0x01, 0x00, 0x00, 0x00,
  // ACE @52: type=ALLOW, flags=0, size=0x14, mask=0x10000000 (GENERIC_ALL), SID S-1-1-0
  0x00, 0x00, 0x14, 0x00, 0x00, 0x00, 0x00, 0x10,
  0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
]);

describe("security descriptor parser", () => {
  it("parses owner, group, and the DACL ACE", () => {
    const sd = parseSecurityDescriptor(SD);
    expect(sd).not.toBeNull();
    expect(sd!.owner?.sid).toBe("S-1-5-18");
    expect(sd!.owner?.name).toBe("NT AUTHORITY\\SYSTEM");
    expect(sd!.group?.sid).toBe("S-1-5-18");
    expect(sd!.daclPresent).toBe(true);
    expect(sd!.dacl?.aces).toHaveLength(1);

    const ace = sd!.dacl!.aces[0];
    expect(ace.type).toBe("ACCESS_ALLOWED");
    expect(ace.trustee.sid).toBe("S-1-1-0");
    expect(ace.trustee.name).toBe("Everyone");
    expect(ace.rights).toContain("GENERIC_ALL");
    expect(ace.flags).toEqual([]);
  });

  it("round-trips to the expected SDDL", () => {
    const sd = parseSecurityDescriptor(SD)!;
    expect(toSddl(sd)).toBe("O:SYG:SYD:(A;;GA;;;WD)");
  });

  it("returns null for bytes that are not a security descriptor", () => {
    expect(parseSecurityDescriptor(new TextEncoder().encode("hello, world"))).toBeNull();
    expect(parseSecurityDescriptor(new Uint8Array([0x02, 0x00, 0x04, 0x80]))).toBeNull(); // wrong revision
    expect(parseSecurityDescriptor(new Uint8Array(8))).toBeNull(); // too short / not self-relative
  });

  it("decodes access masks into rights and SDDL tokens", () => {
    expect(decodeRights(0x10000000)).toEqual(["GENERIC_ALL"]);
    expect(rightsSddl(0x10000000)).toBe("GA");
    expect(rightsSddl(0x1f01ff)).toBe("FA"); // FILE_ALL_ACCESS combo
    // WRITE_DAC | WRITE_OWNER -> WDWO
    expect(rightsSddl(0x000c0000)).toBe("WDWO");
    expect(decodeRights(0x000c0000)).toEqual(["WRITE_DAC", "WRITE_OWNER"]);
  });

  it("resolves well-known SIDs to aliases and names", () => {
    expect(sddlSid("S-1-5-32-544")).toBe("BA");
    expect(wellKnownSidName("S-1-5-32-544")).toBe("BUILTIN\\Administrators");
    expect(sddlSid("S-1-1-0")).toBe("WD");
    expect(sddlSid("S-1-5-21-1-2-3-512")).toBe("DA"); // domain RID
    expect(sddlSid("S-1-5-21-9-9-9-1107")).toBe("S-1-5-21-9-9-9-1107"); // unknown -> raw
  });

  it("resolves well-known AD object GUIDs (case-insensitive)", () => {
    expect(guidName("1131f6ad-9c07-11d1-f79f-00c04fc2dcd2")).toBe(
      "DS-Replication-Get-Changes-All",
    );
    expect(guidName("00299570-246D-11D0-A768-00AA006E0529")).toBe(
      "User-Force-Change-Password",
    );
    expect(guidName("5b47d60f-6090-40b2-9f37-2a4de88f3063")).toBe(
      "msDS-KeyCredentialLink (attribute)",
    );
    expect(guidName("00000000-0000-0000-0000-000000000000")).toBeUndefined();
  });
});
