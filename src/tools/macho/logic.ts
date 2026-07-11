/**
 * Parse a Mach-O (macOS / iOS) binary - the third leg of the ELF/PE/Mach-O trio.
 * Handles 32- and 64-bit, both byte orders, and fat/universal binaries. Reads the
 * mach header, walks the load commands for segments/sections, linked dylibs, the
 * UUID, entry point, code-signature and encryption state, and decodes the MH_
 * flags (PIE etc.). Pure binary parsing.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface MachoResult {
  fatArches?: { cpu: string; offset: number; size: number }[];
  bits: 32 | 64;
  endian: string;
  cpu: string;
  filetype: string;
  flags: string[];
  ncmds: number;
  uuid?: string;
  entry?: string;
  signed: boolean;
  encrypted: boolean;
  segments: { name: string; vmaddr: number; vmsize: number; sections: string[] }[];
  dylibs: string[];
  rpaths: string[];
  findings: Finding[];
  error: string;
}

const CPU: Record<number, string> = {
  7: "x86",
  0x01000007: "x86-64",
  12: "ARM",
  0x0100000c: "ARM64",
  0x0200000c: "ARM64e",
  18: "PowerPC",
  0x01000012: "PowerPC64",
};

const FILETYPES: Record<number, string> = {
  1: "OBJECT",
  2: "EXECUTE",
  3: "FVMLIB",
  4: "CORE",
  5: "PRELOAD",
  6: "DYLIB",
  7: "DYLINKER",
  8: "BUNDLE",
  0xa: "DSYM",
  0xb: "KEXT_BUNDLE",
};

const MH_FLAGS: [number, string][] = [
  [0x00000001, "NOUNDEFS"],
  [0x00000080, "TWOLEVEL"],
  [0x00020000, "ALLOW_STACK_EXECUTION"],
  [0x00200000, "PIE"],
  [0x00100000, "NO_REEXPORTED_DYLIBS"],
  [0x00800000, "HAS_TLV_DESCRIPTORS"],
  [0x01000000, "NO_HEAP_EXECUTION"],
];

// Load commands
const LC_REQ = 0x80000000;
const LC_SEGMENT = 0x1;
const LC_SEGMENT_64 = 0x19;
const LC_LOAD_DYLIB = 0xc;
const LC_ID_DYLIB = 0xd;
const LC_LOAD_WEAK_DYLIB = 0x18 | LC_REQ;
const LC_REEXPORT_DYLIB = 0x1f | LC_REQ;
const LC_UUID = 0x1b;
const LC_CODE_SIGNATURE = 0x1d;
const LC_ENCRYPTION_INFO = 0x21;
const LC_ENCRYPTION_INFO_64 = 0x2c;
const LC_MAIN = 0x28 | LC_REQ;
const LC_RPATH = 0x1c | LC_REQ;

function cstr(bytes: Uint8Array, off: number, max = 1024): string {
  let end = off;
  while (end < bytes.length && end < off + max && bytes[end] !== 0) end++;
  return new TextDecoder("latin1").decode(bytes.subarray(off, end));
}

function fixed(bytes: Uint8Array, off: number, len: number): string {
  return cstr(bytes, off, len);
}

function parseSlice(bytes: Uint8Array, base: number, le: boolean, is64: boolean): MachoResult {
  const r: MachoResult = {
    bits: is64 ? 64 : 32,
    endian: le ? "little-endian" : "big-endian",
    cpu: "",
    filetype: "",
    flags: [],
    ncmds: 0,
    signed: false,
    encrypted: false,
    segments: [],
    dylibs: [],
    rpaths: [],
    findings: [],
    error: "",
  };
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u32 = (o: number) => dv.getUint32(o, le);
  const u64 = (o: number) => Number(dv.getBigUint64(o, le));

  const cputype = u32(base + 4);
  r.cpu = CPU[cputype >>> 0] ?? `cpu 0x${(cputype >>> 0).toString(16)}`;
  r.filetype = FILETYPES[u32(base + 12)] ?? `filetype ${u32(base + 12)}`;
  const ncmds = u32(base + 16);
  r.ncmds = ncmds;
  const mhflags = u32(base + 24);
  r.flags = MH_FLAGS.filter(([b]) => mhflags & b).map(([, n]) => n);

  let off = base + (is64 ? 32 : 28);
  for (let i = 0; i < Math.min(ncmds, 4096); i++) {
    if (off + 8 > bytes.length) break;
    const cmd = u32(off) >>> 0;
    const cmdsize = u32(off + 4);
    if (cmdsize < 8 || off + cmdsize > bytes.length) break;

    if (cmd === LC_SEGMENT || cmd === LC_SEGMENT_64) {
      const seg64 = cmd === LC_SEGMENT_64;
      const name = fixed(bytes, off + 8, 16);
      const vmaddr = seg64 ? u64(off + 24) : u32(off + 24);
      const vmsize = seg64 ? u64(off + 32) : u32(off + 28);
      const nsects = seg64 ? u32(off + 64) : u32(off + 48);
      const sectStart = off + (seg64 ? 72 : 56);
      const sectSize = seg64 ? 80 : 68;
      const sections: string[] = [];
      for (let s = 0; s < Math.min(nsects, 512); s++) {
        const so = sectStart + s * sectSize;
        if (so + 16 > bytes.length) break;
        sections.push(fixed(bytes, so, 16));
      }
      r.segments.push({ name, vmaddr, vmsize, sections });
    } else if (cmd === LC_LOAD_DYLIB || cmd === LC_LOAD_WEAK_DYLIB || cmd === LC_REEXPORT_DYLIB) {
      const strOff = u32(off + 8);
      r.dylibs.push(cstr(bytes, off + strOff).replace(/^.*\//, "")); // basename
    } else if (cmd === LC_ID_DYLIB) {
      // this dylib's own id - skip from the linked list
    } else if (cmd === LC_RPATH) {
      const strOff = u32(off + 8);
      r.rpaths.push(cstr(bytes, off + strOff));
    } else if (cmd === LC_UUID) {
      r.uuid = Array.from(bytes.subarray(off + 8, off + 24), (b) => b.toString(16).padStart(2, "0"))
        .join("")
        .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
    } else if (cmd === LC_CODE_SIGNATURE) {
      r.signed = true;
    } else if (cmd === LC_ENCRYPTION_INFO || cmd === LC_ENCRYPTION_INFO_64) {
      if (u32(off + 16) !== 0) r.encrypted = true; // cryptid
    } else if (cmd === LC_MAIN) {
      r.entry = "0x" + u64(off + 8).toString(16);
    }
    off += cmdsize;
  }

  r.findings = analyzeMacho(r);
  return r;
}

function analyzeMacho(r: MachoResult): Finding[] {
  const f: Finding[] = [];
  if (r.filetype === "EXECUTE" && !r.flags.includes("PIE")) {
    f.push({ severity: "medium", message: "No PIE (MH_PIE not set) - the executable isn't position-independent, defeating ASLR." });
  }
  if (r.flags.includes("ALLOW_STACK_EXECUTION")) {
    f.push({ severity: "high", message: "MH_ALLOW_STACK_EXECUTION - the stack is executable." });
  }
  if (r.encrypted) {
    f.push({ severity: "info", message: "Encrypted segment (cryptid ≠ 0) - FairPlay / App Store protection; dump from memory to analyze." });
  }
  if (r.filetype === "EXECUTE" && !r.signed) {
    f.push({ severity: "info", message: "No LC_CODE_SIGNATURE - the binary is unsigned." });
  }
  return f;
}

export function parseMacho(bytes: Uint8Array): MachoResult {
  const base: MachoResult = {
    bits: 64,
    endian: "",
    cpu: "",
    filetype: "",
    flags: [],
    ncmds: 0,
    signed: false,
    encrypted: false,
    segments: [],
    dylibs: [],
    rpaths: [],
    findings: [],
    error: "",
  };
  try {
    if (bytes.length < 28) return { ...base, error: "Too small to be a Mach-O binary." };
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const beMagic = dv.getUint32(0, false);

    // Fat / universal binary (big-endian magic). Note: shares 0xCAFEBABE with a
    // Java .class file - guard on a sane arch count.
    if (beMagic === 0xcafebabe || beMagic === 0xcafebabf) {
      const fat64 = beMagic === 0xcafebabf;
      const nfat = dv.getUint32(4, false);
      if (nfat > 30) {
        return { ...base, error: "0xCAFEBABE with an implausible arch count - this looks like a Java .class file, not a Mach-O fat binary." };
      }
      const arches: { cpu: string; offset: number; size: number }[] = [];
      const entrySize = fat64 ? 32 : 20;
      for (let i = 0; i < nfat; i++) {
        const e = 8 + i * entrySize;
        if (e + entrySize > bytes.length) break;
        const cputype = dv.getUint32(e, false);
        const offset = fat64 ? Number(dv.getBigUint64(e + 8, false)) : dv.getUint32(e + 8, false);
        const size = fat64 ? Number(dv.getBigUint64(e + 16, false)) : dv.getUint32(e + 12, false);
        arches.push({ cpu: CPU[cputype >>> 0] ?? `cpu 0x${(cputype >>> 0).toString(16)}`, offset, size });
      }
      if (!arches.length) return { ...base, error: "Fat header has no architectures." };
      // Parse the first slice as the representative Mach-O.
      const first = arches[0];
      const sliceMagic = dv.getUint32(first.offset, false);
      const le = sliceMagic === 0xcefaedfe || sliceMagic === 0xcffaedfe;
      const is64 = sliceMagic === 0xfeedfacf || sliceMagic === 0xcffaedfe;
      const r = parseSlice(bytes, first.offset, le, is64);
      r.fatArches = arches;
      return r;
    }

    // Thin Mach-O. Detect endianness + width from the magic.
    const magics: Record<number, { le: boolean; is64: boolean }> = {
      0xfeedface: { le: false, is64: false },
      0xfeedfacf: { le: false, is64: true },
      0xcefaedfe: { le: true, is64: false },
      0xcffaedfe: { le: true, is64: true },
    };
    const m = magics[beMagic >>> 0];
    if (!m) return { ...base, error: "Not a Mach-O binary (unrecognized magic)." };
    return parseSlice(bytes, 0, m.le, m.is64);
  } catch (e) {
    return { ...base, error: `Parse error: ${e instanceof Error ? e.message : String(e)}` };
  }
}
