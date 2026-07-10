/**
 * Inspect an ELF binary's exploit-mitigation posture — the `checksec` view —
 * entirely in the browser. Parses the ELF header, program headers, section
 * headers and the dynamic/symbol tables to determine RELRO, stack canary, NX,
 * PIE, Fortify, RPATH/RUNPATH and whether it's stripped. Pure binary parsing,
 * no DOM beyond the caller.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface ElfResult {
  bits: 32 | 64 | 0;
  endian: string;
  type: string;
  machine: string;
  relro: "Full" | "Partial" | "None";
  canary: boolean;
  nx: boolean;
  pie: string;
  fortify: boolean;
  stripped: boolean;
  linkage: string;
  rpath?: string;
  runpath?: string;
  findings: Finding[];
  error: string;
}

const E_TYPES: Record<number, string> = {
  1: "REL (object)",
  2: "EXEC (executable)",
  3: "DYN (shared / PIE)",
  4: "CORE",
};

const MACHINES: Record<number, string> = {
  0x02: "SPARC",
  0x03: "x86 (i386)",
  0x08: "MIPS",
  0x14: "PowerPC",
  0x15: "PowerPC64",
  0x16: "S390",
  0x28: "ARM",
  0x2a: "SuperH",
  0x32: "IA-64",
  0x3e: "x86-64",
  0xb7: "AArch64",
  0xf3: "RISC-V",
};

// Program header types
const PT_INTERP = 3;
const PT_DYNAMIC = 2;
const PT_GNU_STACK = 0x6474e551;
const PT_GNU_RELRO = 0x6474e552;
const PF_X = 1;

// Section header types
const SHT_SYMTAB = 2;
const SHT_DYNSYM = 11;
const SHT_DYNAMIC = 6;

// Dynamic tags
const DT_NULL = 0;
const DT_RPATH = 15;
const DT_RUNPATH = 29;
const DT_FLAGS = 30;
const DT_BIND_NOW = 24;
const DT_FLAGS_1 = 0x6ffffffb;
const DF_BIND_NOW = 0x8;
const DF_1_NOW = 0x1;

/** Convert raw input (base64, hex, or a data blob) into bytes. */
export function bytesFromInput(input: string): Uint8Array {
  const t = input.trim();
  const hex = t.replace(/0x/gi, "").replace(/[\s:,-]/g, "");
  if (hex.length >= 8 && hex.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hex)) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  const b64 = t.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function cstr(bytes: Uint8Array, off: number): string {
  let end = off;
  while (end < bytes.length && bytes[end] !== 0) end++;
  return new TextDecoder("latin1").decode(bytes.subarray(off, end));
}

export function parseElf(bytes: Uint8Array): ElfResult {
  const r: ElfResult = {
    bits: 0,
    endian: "",
    type: "",
    machine: "",
    relro: "None",
    canary: false,
    nx: true,
    pie: "",
    fortify: false,
    stripped: true,
    linkage: "static",
    findings: [],
    error: "",
  };

  try {
    if (bytes.length < 64 || bytes[0] !== 0x7f || bytes[1] !== 0x45 || bytes[2] !== 0x4c || bytes[3] !== 0x46) {
      return { ...r, error: "Not an ELF binary (missing the \\x7fELF magic)." };
    }
    const is64 = bytes[4] === 2;
    const le = bytes[5] === 1;
    r.bits = is64 ? 64 : 32;
    r.endian = le ? "little-endian" : "big-endian";

    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = (o: number) => dv.getUint16(o, le);
    const u32 = (o: number) => dv.getUint32(o, le);
    const u64 = (o: number) => Number(dv.getBigUint64(o, le));

    r.type = E_TYPES[u16(16)] ?? `type ${u16(16)}`;
    r.machine = MACHINES[u16(18)] ?? `machine 0x${u16(18).toString(16)}`;
    const etype = u16(16);

    const phoff = is64 ? u64(32) : u32(28);
    const phentsize = is64 ? u16(54) : u16(42);
    const phnum = is64 ? u16(56) : u16(44);
    const shoff = is64 ? u64(40) : u32(32);
    const shentsize = is64 ? u16(58) : u16(46);
    const shnum = is64 ? u16(60) : u16(48);

    // --- Program headers: NX, RELRO segment, interpreter, dynamic ---
    let hasGnuStack = false;
    let gnuStackX = false;
    let hasRelroSeg = false;
    let hasInterp = false;
    let dynSegOff = 0;
    let dynSegSize = 0;
    for (let i = 0; i < phnum; i++) {
      const p = phoff + i * phentsize;
      if (p + phentsize > bytes.length) break;
      const ptype = u32(p);
      const pflags = is64 ? u32(p + 4) : u32(p + 24);
      if (ptype === PT_GNU_STACK) {
        hasGnuStack = true;
        gnuStackX = (pflags & PF_X) !== 0;
      } else if (ptype === PT_GNU_RELRO) {
        hasRelroSeg = true;
      } else if (ptype === PT_INTERP) {
        hasInterp = true;
      } else if (ptype === PT_DYNAMIC) {
        r.linkage = "dynamic";
        dynSegOff = is64 ? u64(p + 8) : u32(p + 4); // p_offset
        dynSegSize = is64 ? u64(p + 32) : u32(p + 16); // p_filesz
      }
    }
    r.nx = !(hasGnuStack && gnuStackX);
    if (hasInterp) r.linkage = "dynamic";

    // Scan a symbol table for the stack-canary and Fortify markers.
    const scanSymbols = (symOff: number, symSize: number, strOff: number, entHint: number) => {
      const ent = entHint || (is64 ? 24 : 16);
      const count = Math.min(Math.floor(symSize / ent), 50000);
      for (let i = 0; i < count; i++) {
        const s = symOff + i * ent;
        if (s + 4 > bytes.length) break;
        const nameOff = u32(s);
        if (!nameOff) continue;
        const name = cstr(bytes, strOff + nameOff);
        if (name === "__stack_chk_fail" || name === "__stack_chk_guard") r.canary = true;
        else if (/_chk$/.test(name)) r.fortify = true;
      }
    };

    // Scan a dynamic array for BIND_NOW (Full RELRO) and, when a string table
    // offset is given, RPATH/RUNPATH. Returns whether BIND_NOW was seen.
    const scanDynamic = (dynOff: number, dynSize: number, dynStrOff: number) => {
      const entsize = is64 ? 16 : 8;
      let bind = false;
      const count = Math.min(Math.floor(dynSize / entsize), 20000);
      for (let i = 0; i < count; i++) {
        const d = dynOff + i * entsize;
        if (d + entsize > bytes.length) break;
        const tag = is64 ? Number(dv.getBigInt64(d, le)) : dv.getInt32(d, le);
        const val = is64 ? u64(d + 8) : u32(d + 4);
        if (tag === DT_NULL) break;
        if (tag === DT_BIND_NOW) bind = true;
        else if (tag === DT_FLAGS && val & DF_BIND_NOW) bind = true;
        else if (tag === DT_FLAGS_1 && val & DF_1_NOW) bind = true;
        else if (dynStrOff && tag === DT_RPATH) r.rpath = cstr(bytes, dynStrOff + val);
        else if (dynStrOff && tag === DT_RUNPATH) r.runpath = cstr(bytes, dynStrOff + val);
      }
      return bind;
    };

    let bindNow = false;
    let dynParsed = false;

    // --- Section headers: symbols (canary/fortify/stripped), dynamic (relro-now, rpath) ---
    if (shoff && shnum && shoff + shnum * shentsize <= bytes.length) {
      const shType = (i: number) => u32(shoff + i * shentsize + 4);
      const shOff = (i: number) => (is64 ? u64(shoff + i * shentsize + 24) : u32(shoff + i * shentsize + 16));
      const shSize = (i: number) => (is64 ? u64(shoff + i * shentsize + 32) : u32(shoff + i * shentsize + 20));
      const shLink = (i: number) => u32(shoff + i * shentsize + (is64 ? 40 : 24));
      const shEnt = (i: number) => (is64 ? u64(shoff + i * shentsize + 56) : u32(shoff + i * shentsize + 36));

      let symtabIdx = -1;
      let dynsymIdx = -1;
      let dynamicIdx = -1;
      for (let i = 0; i < shnum; i++) {
        const t = shType(i);
        if (t === SHT_SYMTAB) symtabIdx = i;
        else if (t === SHT_DYNSYM) dynsymIdx = i;
        else if (t === SHT_DYNAMIC) dynamicIdx = i;
      }
      r.stripped = symtabIdx < 0;

      // Canary/Fortify markers live in .symtab (static / non-stripped) OR .dynsym.
      if (dynsymIdx >= 0) scanSymbols(shOff(dynsymIdx), shSize(dynsymIdx), shOff(shLink(dynsymIdx)), shEnt(dynsymIdx));
      if (symtabIdx >= 0) scanSymbols(shOff(symtabIdx), shSize(symtabIdx), shOff(shLink(symtabIdx)), shEnt(symtabIdx));

      if (dynamicIdx >= 0) {
        bindNow = scanDynamic(shOff(dynamicIdx), shSize(dynamicIdx), shOff(shLink(dynamicIdx)));
        dynParsed = true;
      }
    } else {
      r.stripped = true; // no section headers to prove otherwise
    }

    // If section headers didn't yield a dynamic table (section-stripped binary),
    // read BIND_NOW straight from the PT_DYNAMIC segment.
    if (!dynParsed && dynSegOff) bindNow = scanDynamic(dynSegOff, dynSegSize, 0);

    r.relro = hasRelroSeg ? (bindNow ? "Full" : "Partial") : "None";

    // PIE / linkage classification.
    if (etype === 2) r.pie = "No PIE";
    else if (etype === 3) r.pie = hasInterp ? "PIE" : "DSO (shared object)";
    else r.pie = r.type;

    r.findings = analyzeElf(r);
    return r;
  } catch (e) {
    return { ...r, error: `Parse error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function analyzeElf(r: ElfResult): Finding[] {
  const f: Finding[] = [];
  if (!r.nx) f.push({ severity: "high", message: "NX disabled — the stack is executable, so injected shellcode can run directly." });
  if (r.pie === "No PIE") f.push({ severity: "medium", message: "No PIE — the executable loads at a fixed base, defeating ASLR for its own code/gadgets." });
  if (!r.canary && r.pie !== "DSO (shared object)") f.push({ severity: "medium", message: "No stack canary — stack buffer overflows aren't detected before the return address is used." });
  if (r.relro === "None") f.push({ severity: "medium", message: "No RELRO — the GOT is writable; a write primitive can hijack control flow via GOT overwrite." });
  else if (r.relro === "Partial") f.push({ severity: "info", message: "Partial RELRO — the GOT is still writable (lazy binding); Full RELRO (BIND_NOW) would harden it." });
  if (r.rpath) f.push({ severity: "medium", message: `RPATH set (${r.rpath}) — libraries load from a hard-coded, non-overridable path; a writable entry enables library injection.` });
  if (r.runpath) f.push({ severity: "info", message: `RUNPATH set (${r.runpath}) — check the listed directories aren't attacker-writable.` });
  if (!r.fortify && r.linkage === "dynamic") f.push({ severity: "info", message: "No Fortify Source — libc `_chk` bounds-checked wrappers aren't used." });
  return f;
}
