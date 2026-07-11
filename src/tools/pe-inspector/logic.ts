/**
 * Inspect a Windows PE (EXE/DLL/SYS) in the browser - the headers a malware
 * analyst or RE first reaches for. Parses the DOS/PE/COFF and optional headers,
 * decodes the DllCharacteristics mitigations (ASLR/DEP/CFG/SEH), lists the data
 * directories (signed? .NET?), the section table (with Shannon entropy to spot
 * packing) and the import table (which DLLs/APIs it pulls in). Pure parsing.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface PeSection {
  name: string;
  vaddr: number;
  vsize: number;
  rawSize: number;
  perms: string;
  entropy: number;
}

export interface PeImport {
  dll: string;
  count: number;
}

export interface PeResult {
  format: string; // PE32 / PE32+
  machine: string;
  kind: string; // EXE / DLL / driver
  subsystem: string;
  timestamp?: string;
  entryPoint: string;
  imageBase: string;
  dllChars: string[];
  mitigations: { aslr: boolean; highEntropyVa: boolean; dep: boolean; cfg: boolean; seh: boolean };
  signed: boolean;
  dotnet: boolean;
  directories: string[];
  sections: PeSection[];
  imports: PeImport[];
  findings: Finding[];
  error: string;
}

const MACHINES: Record<number, string> = {
  0x014c: "x86 (i386)",
  0x0200: "IA-64",
  0x8664: "x86-64 (AMD64)",
  0x01c0: "ARM",
  0x01c4: "ARMv7 (Thumb)",
  0xaa64: "ARM64",
};

const SUBSYSTEMS: Record<number, string> = {
  1: "Native",
  2: "Windows GUI",
  3: "Windows console",
  5: "OS/2 console",
  7: "POSIX console",
  9: "Windows CE GUI",
  10: "EFI application",
  11: "EFI boot driver",
  12: "EFI runtime driver",
  14: "Xbox",
};

const DLL_CHARS: [number, string][] = [
  [0x0020, "HIGH_ENTROPY_VA"],
  [0x0040, "DYNAMIC_BASE"],
  [0x0080, "FORCE_INTEGRITY"],
  [0x0100, "NX_COMPAT"],
  [0x0200, "NO_ISOLATION"],
  [0x0400, "NO_SEH"],
  [0x0800, "NO_BIND"],
  [0x1000, "APPCONTAINER"],
  [0x2000, "WDM_DRIVER"],
  [0x4000, "GUARD_CF"],
  [0x8000, "TERMINAL_SERVER_AWARE"],
];

const DIRECTORIES = [
  "Export",
  "Import",
  "Resource",
  "Exception",
  "Certificate",
  "BaseReloc",
  "Debug",
  "Architecture",
  "GlobalPtr",
  "TLS",
  "LoadConfig",
  "BoundImport",
  "IAT",
  "DelayImport",
  "CLR",
  "Reserved",
];

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

function cstr(bytes: Uint8Array, off: number, max = 512): string {
  let end = off;
  while (end < bytes.length && end < off + max && bytes[end] !== 0) end++;
  return new TextDecoder("latin1").decode(bytes.subarray(off, end));
}

function entropy(bytes: Uint8Array, off: number, len: number): number {
  const n = Math.min(len, bytes.length - off);
  if (n <= 0) return 0;
  const freq = new Array(256).fill(0);
  for (let i = 0; i < n; i++) freq[bytes[off + i]]++;
  let e = 0;
  for (const c of freq) {
    if (!c) continue;
    const p = c / n;
    e -= p * Math.log2(p);
  }
  return Math.round(e * 100) / 100;
}

export function parsePe(bytes: Uint8Array): PeResult {
  const r: PeResult = {
    format: "",
    machine: "",
    kind: "",
    subsystem: "",
    entryPoint: "",
    imageBase: "",
    dllChars: [],
    mitigations: { aslr: false, highEntropyVa: false, dep: false, cfg: false, seh: false },
    signed: false,
    dotnet: false,
    directories: [],
    sections: [],
    imports: [],
    findings: [],
    error: "",
  };

  try {
    if (bytes.length < 64 || bytes[0] !== 0x4d || bytes[1] !== 0x5a) {
      return { ...r, error: "Not a PE file (missing the 'MZ' DOS signature)." };
    }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = (o: number) => dv.getUint16(o, true);
    const u32 = (o: number) => dv.getUint32(o, true);

    const peOff = u32(0x3c);
    if (peOff + 24 > bytes.length || u32(peOff) !== 0x00004550) {
      return { ...r, error: "Not a PE file (missing the 'PE\\0\\0' signature)." };
    }

    // COFF file header
    const coff = peOff + 4;
    r.machine = MACHINES[u16(coff)] ?? `machine 0x${u16(coff).toString(16)}`;
    const numSections = u16(coff + 2);
    const tds = u32(coff + 4);
    if (tds) r.timestamp = new Date(tds * 1000).toISOString();
    const sizeOfOptHdr = u16(coff + 16);
    const characteristics = u16(coff + 18);
    r.kind = characteristics & 0x2000 ? "DLL" : characteristics & 0x0002 ? "Executable" : "Object";

    // Optional header
    const opt = coff + 20;
    const optMagic = u16(opt);
    const is64 = optMagic === 0x20b;
    r.format = is64 ? "PE32+" : "PE32";
    r.entryPoint = "0x" + u32(opt + 16).toString(16);
    r.imageBase = is64
      ? "0x" + dv.getBigUint64(opt + 24, true).toString(16)
      : "0x" + u32(opt + 28).toString(16);
    r.subsystem = SUBSYSTEMS[u16(opt + 68)] ?? `subsystem ${u16(opt + 68)}`;
    const dllc = u16(opt + 70);
    r.dllChars = DLL_CHARS.filter(([b]) => dllc & b).map(([, n]) => n);
    r.mitigations = {
      aslr: (dllc & 0x0040) !== 0,
      highEntropyVa: (dllc & 0x0020) !== 0,
      dep: (dllc & 0x0100) !== 0,
      cfg: (dllc & 0x4000) !== 0,
      seh: (dllc & 0x0400) === 0, // NO_SEH clear → SEH usable
    };

    const numRva = u32(opt + (is64 ? 108 : 92));
    const dirBase = opt + (is64 ? 112 : 96);
    const dir: { rva: number; size: number }[] = [];
    for (let i = 0; i < Math.min(numRva, 16); i++) {
      dir.push({ rva: u32(dirBase + i * 8), size: u32(dirBase + i * 8 + 4) });
      if (dir[i].rva || dir[i].size) r.directories.push(DIRECTORIES[i] ?? `dir${i}`);
    }
    r.signed = !!(dir[4]?.rva && dir[4]?.size); // Certificate directory
    r.dotnet = !!(dir[14]?.rva && dir[14]?.size); // CLR runtime header

    // Section table
    const secBase = opt + sizeOfOptHdr;
    for (let i = 0; i < Math.min(numSections, 96); i++) {
      const s = secBase + i * 40;
      if (s + 40 > bytes.length) break;
      const ch = u32(s + 36);
      const perms =
        (ch & 0x40000000 ? "r" : "-") + (ch & 0x80000000 ? "w" : "-") + (ch & 0x20000000 ? "x" : "-");
      const rawSize = u32(s + 16);
      const ptrRaw = u32(s + 20);
      r.sections.push({
        name: cstr(bytes, s, 8),
        vaddr: u32(s + 12),
        vsize: u32(s + 8),
        rawSize,
        perms,
        entropy: rawSize && ptrRaw ? entropy(bytes, ptrRaw, rawSize) : 0,
      });
    }

    // RVA → file offset via the section table.
    const rvaToOff = (rva: number): number => {
      for (const s of r.sections) {
        const span = Math.max(s.vsize, s.rawSize);
        if (rva >= s.vaddr && rva < s.vaddr + span) return rva - s.vaddr + sectionPtr(bytes, secBase, r.sections.indexOf(s));
      }
      return -1;
    };

    // Imports
    const imp = dir[1];
    if (imp?.rva) {
      let d = rvaToOff(imp.rva);
      for (let i = 0; d >= 0 && d + 20 <= bytes.length && i < 1024; i++, d += 20) {
        const origThunk = u32(d);
        const nameRva = u32(d + 12);
        const firstThunk = u32(d + 16);
        if (!nameRva && !firstThunk && !origThunk) break;
        const nameOff = rvaToOff(nameRva);
        const dll = nameOff >= 0 ? cstr(bytes, nameOff, 256) : "";
        if (!dll) continue;
        // Count thunks (null-terminated array).
        let count = 0;
        const thunkRva = origThunk || firstThunk;
        let t = rvaToOff(thunkRva);
        const step = is64 ? 8 : 4;
        while (t >= 0 && t + step <= bytes.length && count < 8192) {
          const v = is64 ? Number(dv.getBigUint64(t, true)) : u32(t);
          if (v === 0) break;
          count++;
          t += step;
        }
        r.imports.push({ dll, count });
      }
    }

    r.findings = analyzePe(r);
    return r;
  } catch (e) {
    return { ...r, error: `Parse error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// PointerToRawData for a section index (read back from the header table).
function sectionPtr(bytes: Uint8Array, secBase: number, idx: number): number {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return dv.getUint32(secBase + idx * 40 + 20, true);
}

function analyzePe(r: PeResult): Finding[] {
  const f: Finding[] = [];
  if (!r.mitigations.aslr) f.push({ severity: "medium", message: "No ASLR (DYNAMIC_BASE not set) - the image loads at a fixed base, aiding exploitation." });
  if (!r.mitigations.dep) f.push({ severity: "medium", message: "No DEP (NX_COMPAT not set) - data pages are executable." });
  if (!r.mitigations.cfg) f.push({ severity: "info", message: "No Control Flow Guard (GUARD_CF) - indirect-call integrity isn't enforced." });
  if (r.kind === "Executable" && !r.signed) f.push({ severity: "info", message: "Not Authenticode-signed." });
  if (r.dotnet) f.push({ severity: "info", message: ".NET / CLR assembly - decompile with dnSpy / ILSpy rather than a disassembler." });
  for (const s of r.sections) {
    if (s.perms.includes("w") && s.perms.includes("x")) {
      f.push({ severity: "medium", message: `Section ${s.name} is writable AND executable (${s.perms}) - self-modifying / injected code.` });
    }
    if (s.entropy >= 7.2 && s.rawSize > 512) {
      f.push({ severity: "info", message: `Section ${s.name} has high entropy (${s.entropy}) - likely packed, compressed or encrypted.` });
    }
  }
  return f;
}
