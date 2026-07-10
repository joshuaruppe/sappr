import { describe, expect, it } from "vitest";
import { parseElf, bytesFromInput } from "./logic";

/** Minimal ELF64: header + PT_GNU_STACK (RW) + PT_GNU_RELRO program headers, and
 * section headers with a .dynsym exporting __stack_chk_fail (→ canary). */
function buildElf64(): Uint8Array {
  const buf = new Uint8Array(528);
  const dv = new DataView(buf.buffer);
  buf.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1], 0); // magic, 64-bit, LE, version
  dv.setUint16(16, 3, true); // e_type = DYN
  dv.setUint16(18, 0x3e, true); // e_machine = x86-64
  dv.setUint32(20, 1, true);
  dv.setBigUint64(32, 64n, true); // e_phoff
  dv.setBigUint64(40, 272n, true); // e_shoff
  dv.setUint16(54, 56, true); // e_phentsize
  dv.setUint16(56, 2, true); // e_phnum
  dv.setUint16(58, 64, true); // e_shentsize
  dv.setUint16(60, 4, true); // e_shnum
  dv.setUint16(62, 3, true); // e_shstrndx

  // Program headers
  dv.setUint32(64, 0x6474e551, true); // PT_GNU_STACK
  dv.setUint32(68, 6, true); //   flags R+W (no X → NX enabled)
  dv.setUint32(120, 0x6474e552, true); // PT_GNU_RELRO
  dv.setUint32(124, 4, true);

  // .dynstr @176: "\0__stack_chk_fail\0"
  const dynstr = "\0__stack_chk_fail\0";
  for (let i = 0; i < dynstr.length; i++) buf[176 + i] = dynstr.charCodeAt(i);

  // .dynsym @194: sym0 null, sym1 (st_name=1 → __stack_chk_fail)
  dv.setUint32(218, 1, true);

  // .shstrtab @242
  const shstr = "\0.dynsym\0.dynstr\0.shstrtab\0";
  for (let i = 0; i < shstr.length; i++) buf[242 + i] = shstr.charCodeAt(i);

  // Section headers @272 (entsize 64)
  dv.setUint32(336, 1, true); // sh1 .dynsym: name
  dv.setUint32(340, 11, true); //   type SHT_DYNSYM
  dv.setBigUint64(360, 194n, true); //   offset
  dv.setBigUint64(368, 48n, true); //   size
  dv.setUint32(376, 2, true); //   link → .dynstr (section 2)
  dv.setBigUint64(392, 24n, true); //   entsize
  dv.setUint32(400, 9, true); // sh2 .dynstr: name
  dv.setUint32(404, 3, true); //   type STRTAB
  dv.setBigUint64(424, 176n, true); //   offset
  dv.setBigUint64(432, 18n, true); //   size
  dv.setUint32(464, 17, true); // sh3 .shstrtab: name
  dv.setUint32(468, 3, true);
  dv.setBigUint64(488, 242n, true);
  dv.setBigUint64(496, 27n, true);
  return buf;
}

describe("parseElf", () => {
  const r = parseElf(buildElf64());

  it("reads the ELF header", () => {
    expect(r.error).toBe("");
    expect(r.bits).toBe(64);
    expect(r.endian).toBe("little-endian");
    expect(r.type).toMatch(/DYN/);
    expect(r.machine).toBe("x86-64");
  });

  it("derives the mitigation posture", () => {
    expect(r.nx).toBe(true); // GNU_STACK without X
    expect(r.canary).toBe(true); // __stack_chk_fail present
    expect(r.relro).toBe("Partial"); // GNU_RELRO seg, no BIND_NOW
    expect(r.stripped).toBe(true); // no .symtab
  });

  it("flags partial RELRO", () => {
    expect(r.findings.some((f) => /Partial RELRO/.test(f.message))).toBe(true);
  });

  it("rejects a non-ELF", () => {
    expect(parseElf(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])).error).toMatch(/Not an ELF/);
  });
});

describe("bytesFromInput", () => {
  it("round-trips a base64 blob", () => {
    const elf = buildElf64();
    let bin = "";
    for (const b of elf) bin += String.fromCharCode(b);
    expect(Array.from(bytesFromInput(btoa(bin)))).toEqual(Array.from(elf));
  });
});
