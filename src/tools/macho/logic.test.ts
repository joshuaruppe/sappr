import { describe, expect, it } from "vitest";
import { parseMacho } from "./logic";

/** Minimal 64-bit little-endian Mach-O: header (EXECUTE, PIE) + one __TEXT
 * segment with a __text section + an LC_LOAD_DYLIB. */
function buildMacho(): Uint8Array {
  const buf = new Uint8Array(256);
  const dv = new DataView(buf.buffer);
  buf.set([0xcf, 0xfa, 0xed, 0xfe], 0); // MH_MAGIC_64 stored little-endian
  dv.setUint32(4, 0x01000007, true); // cputype x86-64
  dv.setUint32(12, 2, true); // filetype EXECUTE
  dv.setUint32(16, 2, true); // ncmds
  dv.setUint32(20, 204, true); // sizeofcmds
  dv.setUint32(24, 0x00200000, true); // MH_PIE

  // LC_SEGMENT_64 @32
  dv.setUint32(32, 0x19, true);
  dv.setUint32(36, 152, true); // 72 header + 80 section
  const seg = "__TEXT";
  for (let i = 0; i < seg.length; i++) buf[40 + i] = seg.charCodeAt(i);
  dv.setUint32(96, 1, true); // nsects
  const sect = "__text";
  for (let i = 0; i < sect.length; i++) buf[104 + i] = sect.charCodeAt(i);

  // LC_LOAD_DYLIB @184
  dv.setUint32(184, 0x0c, true);
  dv.setUint32(188, 52, true);
  dv.setUint32(192, 24, true); // name offset
  const dylib = "/usr/lib/libSystem.B.dylib";
  for (let i = 0; i < dylib.length; i++) buf[208 + i] = dylib.charCodeAt(i);
  return buf;
}

describe("parseMacho", () => {
  const r = parseMacho(buildMacho());

  it("reads the mach header", () => {
    expect(r.error).toBe("");
    expect(r.bits).toBe(64);
    expect(r.endian).toBe("little-endian");
    expect(r.cpu).toBe("x86-64");
    expect(r.filetype).toBe("EXECUTE");
    expect(r.flags).toContain("PIE");
  });

  it("walks segments and dylibs", () => {
    expect(r.segments[0].name).toBe("__TEXT");
    expect(r.segments[0].sections).toContain("__text");
    expect(r.dylibs).toContain("libSystem.B.dylib");
  });

  it("flags an unsigned executable", () => {
    expect(r.signed).toBe(false);
    expect(r.findings.some((f) => /CODE_SIGNATURE|unsigned/i.test(f.message))).toBe(true);
  });

  it("distinguishes a Java .class from a Mach-O fat binary", () => {
    // 0xCAFEBABE with major version 52 → implausible fat arch count.
    const jc = new Uint8Array(32);
    jc.set([0xca, 0xfe, 0xba, 0xbe, 0x00, 0x00, 0x00, 0x34], 0);
    expect(parseMacho(jc).error).toMatch(/Java \.class/);
  });

  it("decodes MH flags with the correct constants", () => {
    const buf = buildMacho();
    // 0x100000 = NO_REEXPORTED_DYLIBS, 0x800000 = HAS_TLV_DESCRIPTORS (distinct bits).
    new DataView(buf.buffer).setUint32(24, 0x00100000 | 0x00800000, true);
    const r = parseMacho(buf);
    expect(r.flags).toContain("NO_REEXPORTED_DYLIBS");
    expect(r.flags).toContain("HAS_TLV_DESCRIPTORS");
  });

  it("rejects a non-Mach-O", () => {
    expect(parseMacho(new Uint8Array(64)).error).toMatch(/Not a Mach-O|Too small/);
  });
});
