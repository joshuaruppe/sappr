/**
 * Multi-architecture disassembler powered by Capstone compiled to WebAssembly
 * (`capstone-wasm`). Paste raw bytes (hex/Base64), pick an architecture, and get
 * an address/bytes/mnemonic listing — for reading shellcode, gadgets, firmware
 * snippets or a copied code blob. The ~1.8 MB WASM is dynamic-imported so it only
 * loads when this tool is opened. Analysis only.
 */

export interface ArchOption {
  id: string;
  label: string;
  arch: number;
  mode: number;
}

// Capstone CS_ARCH_* / CS_MODE_* constants (verified against the module).
export const ARCHS: ArchOption[] = [
  { id: "x86-64", label: "x86-64", arch: 3, mode: 8 },
  { id: "x86-32", label: "x86 (32-bit)", arch: 3, mode: 4 },
  { id: "x86-16", label: "x86 (16-bit real mode)", arch: 3, mode: 2 },
  { id: "arm64", label: "ARM64 (AArch64)", arch: 1, mode: 0 },
  { id: "arm", label: "ARM", arch: 0, mode: 0 },
  { id: "thumb", label: "ARM Thumb", arch: 0, mode: 16 },
  { id: "mips32", label: "MIPS32", arch: 2, mode: 4 },
];

export interface DisasmInsn {
  address: number;
  bytes: string;
  mnemonic: string;
  opStr: string;
}

export interface DisasmResult {
  insns: DisasmInsn[];
  error: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modPromise: Promise<any> | null = null;
function getModule() {
  if (!modPromise) {
    modPromise = import("capstone-wasm")
      .then(async (m) => {
        await m.loadCapstone();
        return m;
      })
      .catch((e) => {
        modPromise = null; // don't memoize a failed load — let the next call retry
        throw e;
      });
  }
  return modPromise;
}

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");

export async function disassemble(
  bytes: Uint8Array,
  archId: string,
  address = 0,
): Promise<DisasmResult> {
  if (bytes.length === 0) return { insns: [], error: "" };
  const a = ARCHS.find((x) => x.id === archId) ?? ARCHS[0];
  const m = await getModule();
  const cs = new m.Capstone(a.arch, a.mode);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = cs.disasm(bytes, { address }) as any[];
    const insns: DisasmInsn[] = raw.map((i) => ({
      address: Number(i.address),
      bytes: hex(i.bytes),
      mnemonic: i.mnemonic,
      opStr: i.opStr,
    }));
    return {
      insns,
      error: insns.length ? "" : "No instructions decoded — wrong architecture for these bytes, or they aren't code.",
    };
  } catch (e) {
    return { insns: [], error: e instanceof Error ? e.message : String(e) };
  } finally {
    cs.close();
  }
}
