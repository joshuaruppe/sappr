import { describe, expect, it } from "vitest";
import { parsePe, bytesFromInput } from "./logic";

/** Minimal PE32: DOS stub → PE/COFF → optional header (ASLR+DEP+CFG) → one
 * r-x .text section. */
function buildPe32(): Uint8Array {
  const buf = new Uint8Array(1536);
  const dv = new DataView(buf.buffer);
  buf[0] = 0x4d;
  buf[1] = 0x5a; // "MZ"
  dv.setUint32(0x3c, 64, true); // e_lfanew → PE header
  dv.setUint32(64, 0x00004550, true); // "PE\0\0"

  // COFF file header @68
  dv.setUint16(68, 0x8664, true); // machine x86-64
  dv.setUint16(70, 1, true); // 1 section
  dv.setUint32(72, 1700000000, true); // timestamp
  dv.setUint16(84, 224, true); // SizeOfOptionalHeader
  dv.setUint16(86, 0x0002, true); // EXECUTABLE_IMAGE

  // Optional header @88 (PE32)
  dv.setUint16(88, 0x10b, true); // magic PE32
  dv.setUint32(104, 0x1000, true); // AddressOfEntryPoint
  dv.setUint32(116, 0x400000, true); // ImageBase
  dv.setUint16(156, 2, true); // Subsystem = Windows GUI
  dv.setUint16(158, 0x4140, true); // DllCharacteristics: DYNAMIC_BASE|NX_COMPAT|GUARD_CF
  dv.setUint32(180, 16, true); // NumberOfRvaAndSizes

  // Section header @312 (.text, r-x)
  const name = ".text";
  for (let i = 0; i < name.length; i++) buf[312 + i] = name.charCodeAt(i);
  dv.setUint32(320, 0x1000, true); // VirtualSize
  dv.setUint32(324, 0x1000, true); // VirtualAddress
  dv.setUint32(328, 0x200, true); // SizeOfRawData
  dv.setUint32(332, 0x400, true); // PointerToRawData
  dv.setUint32(348, 0x60000020, true); // CODE | EXECUTE | READ
  return buf;
}

describe("parsePe", () => {
  const r = parsePe(buildPe32());

  it("reads the PE headers", () => {
    expect(r.error).toBe("");
    expect(r.format).toBe("PE32");
    expect(r.machine).toMatch(/x86-64/);
    expect(r.kind).toBe("Executable");
    expect(r.subsystem).toBe("Windows GUI");
    expect(r.entryPoint).toBe("0x1000");
    expect(r.imageBase).toBe("0x400000");
  });

  it("decodes the DllCharacteristics mitigations", () => {
    expect(r.mitigations.aslr).toBe(true);
    expect(r.mitigations.dep).toBe(true);
    expect(r.mitigations.cfg).toBe(true);
    expect(r.mitigations.highEntropyVa).toBe(false);
  });

  it("parses the section table", () => {
    expect(r.sections).toHaveLength(1);
    expect(r.sections[0].name).toBe(".text");
    expect(r.sections[0].perms).toBe("r-x");
  });

  it("flags an unsigned executable", () => {
    expect(r.signed).toBe(false);
    expect(r.findings.some((f) => /Authenticode/.test(f.message))).toBe(true);
  });

  it("rejects a non-PE", () => {
    expect(parsePe(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])).error).toMatch(/Not a PE/);
  });
});

describe("bytesFromInput", () => {
  it("round-trips a base64 blob", () => {
    const pe = buildPe32();
    let bin = "";
    for (const b of pe) bin += String.fromCharCode(b);
    expect(Array.from(bytesFromInput(btoa(bin)))).toEqual(Array.from(pe));
  });
});
