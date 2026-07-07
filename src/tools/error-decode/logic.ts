/**
 * Decode a Windows error code across all three families at once — NTSTATUS,
 * Win32 (ERROR_*) and HRESULT — the way Microsoft's Err.exe does. Looks the value
 * up in a bundled map of ~9,000 codes (name + official message), decodes the
 * HRESULT bit-fields (severity / facility / code), and unwraps the very common
 * FACILITY_WIN32 HRESULTs (0x8007xxxx) back to their underlying Win32 error.
 * The 1.2 MB dataset is dynamic-imported so it only loads with the tool.
 */

interface Entry {
  name: string;
  desc: string;
}

export interface ErrorData {
  ntstatus: Record<string, Entry[]>;
  win32: Record<string, Entry[]>;
  hresult: Record<string, Entry[]>;
}

export type Family = "NTSTATUS" | "Win32" | "HRESULT";

export interface Interpretation {
  family: Family;
  code: string;
  names: string[];
  description: string;
  note?: string;
}

export interface HresultStructure {
  severity: string;
  facility: string;
  facilityNum: number;
  code: number;
  customer: boolean;
}

export interface NtstatusStructure {
  severity: string;
  customer: boolean;
  facility: string;
  facilityNum: number;
  code: number;
}

export interface Suggestion {
  code: string;
  family: Family;
  name: string;
  desc: string;
}

export interface DecodeResult {
  hex?: string;
  decimal?: string;
  signed?: string;
  interpretations: Interpretation[];
  hresultStructure?: HresultStructure;
  ntstatusStructure?: NtstatusStructure;
  /** Near-matches when the input doesn't resolve — likely a typo. */
  suggestions?: Suggestion[];
  /** True when no named code matched — nudge the user to double-check. */
  unrecognized?: boolean;
  error: string;
}

// HRESULT/NTSTATUS facility codes (the common subset; others fall back to a number).
const FACILITIES: Record<number, string> = {
  0: "FACILITY_NULL",
  1: "FACILITY_RPC",
  2: "FACILITY_DISPATCH",
  3: "FACILITY_STORAGE",
  4: "FACILITY_ITF",
  7: "FACILITY_WIN32",
  8: "FACILITY_WINDOWS",
  9: "FACILITY_SSPI",
  10: "FACILITY_CONTROL",
  11: "FACILITY_CERT",
  12: "FACILITY_INTERNET",
  13: "FACILITY_MEDIASERVER",
  14: "FACILITY_MSMQ",
  15: "FACILITY_SETUPAPI",
  16: "FACILITY_SCARD",
  17: "FACILITY_COMPLUS",
  18: "FACILITY_AAF",
  19: "FACILITY_URT",
  20: "FACILITY_ACS",
  21: "FACILITY_DPLAY",
  22: "FACILITY_UMI",
  23: "FACILITY_SXS",
  24: "FACILITY_WINDOWS_CE",
  25: "FACILITY_HTTP",
  26: "FACILITY_USERMODE_COMMONLOG",
  31: "FACILITY_USERMODE_FILTER_MANAGER",
  32: "FACILITY_BACKGROUNDCOPY",
  33: "FACILITY_CONFIGURATION",
  34: "FACILITY_STATE_MANAGEMENT",
  35: "FACILITY_METADIRECTORY",
  36: "FACILITY_WINDOWSUPDATE",
  37: "FACILITY_DIRECTORYSERVICE",
  38: "FACILITY_GRAPHICS",
  39: "FACILITY_SHELL",
  80: "FACILITY_WINDOWS_DEFENDER",
};

function toKey(value: number): string {
  return "0x" + value.toString(16).padStart(8, "0");
}

/** Display form: lowercase `0x` prefix, uppercase hex digits (e.g. 0xC0000022). */
function toDisplay(value: number): string {
  return "0x" + value.toString(16).toUpperCase().padStart(8, "0");
}

function build(value: number, data: ErrorData): Interpretation[] {
  const key = toKey(value);
  const disp = toDisplay(value);
  const dec = String(value);
  const out: Interpretation[] = [];

  const nt = data.ntstatus[key];
  if (nt) out.push({ family: "NTSTATUS", code: disp, names: nt.map((e) => e.name), description: nt[0].desc });

  const w = data.win32[dec];
  if (w) out.push({ family: "Win32", code: `${dec} (${disp})`, names: w.map((e) => e.name), description: w[0].desc });

  const h = data.hresult[key];
  if (h) out.push({ family: "HRESULT", code: disp, names: h.map((e) => e.name), description: h[0].desc });

  // FACILITY_WIN32 failure HRESULTs (0x8007xxxx) wrap a Win32 error code.
  const severity = (value >>> 31) & 1;
  const facility = (value >>> 16) & 0x7ff;
  const low = value & 0xffff;
  if (severity === 1 && facility === 7) {
    const w2 = data.win32[String(low)];
    if (w2) {
      out.push({
        family: "HRESULT",
        code: disp,
        names: [`HRESULT_FROM_WIN32(${low})`],
        description: `Wraps Win32 error ${low} — ${w2[0].name}: ${w2[0].desc}`,
        note: "FACILITY_WIN32",
      });
    }
  }

  return out;
}

/** Whether a value is plausibly a real HRESULT — a failure severity with a named
 * facility. NTSTATUS values, Win32 decimals and typos don't qualify, so we don't
 * mislead by decoding them through the (different) HRESULT bit layout. */
function looksLikeHresult(value: number): boolean {
  const severity = (value >>> 31) & 1;
  const facility = (value >>> 16) & 0x7ff;
  return severity === 1 && FACILITIES[facility] !== undefined;
}

function hresultStructure(value: number): HresultStructure {
  const facility = (value >>> 16) & 0x7ff;
  return {
    severity: (value >>> 31) & 1 ? "Failure" : "Success",
    facility: FACILITIES[facility] ?? `FACILITY_${facility}`,
    facilityNum: facility,
    code: value & 0xffff,
    customer: ((value >>> 29) & 1) === 1,
  };
}

// NTSTATUS has its own layout: Sev (2 bits) | C | N | Facility (12 bits) | Code (16 bits).
const NT_SEVERITY = ["Success", "Informational", "Warning", "Error"];

const NT_FACILITIES: Record<number, string> = {
  0x000: "FACILITY_NULL",
  0x001: "FACILITY_DEBUGGER",
  0x002: "FACILITY_RPC_RUNTIME",
  0x003: "FACILITY_RPC_STUBS",
  0x004: "FACILITY_IO_ERROR_CODE",
  0x007: "FACILITY_NTWIN32",
  0x009: "FACILITY_NTSSPI",
  0x00a: "FACILITY_TERMINAL_SERVER",
  0x00b: "FACILITY_MUI_ERROR_CODE",
  0x00c: "FACILITY_USB_ERROR_CODE",
  0x00d: "FACILITY_HID_ERROR_CODE",
  0x00e: "FACILITY_FIREWIRE_ERROR_CODE",
  0x00f: "FACILITY_CLUSTER_ERROR_CODE",
  0x010: "FACILITY_ACPI_ERROR_CODE",
  0x011: "FACILITY_SXS_ERROR_CODE",
  0x022: "FACILITY_TRANSACTION",
  0x023: "FACILITY_COMMONLOG",
  0x024: "FACILITY_VIDEO",
  0x025: "FACILITY_FILTER_MANAGER",
  0x026: "FACILITY_MONITOR",
  0x027: "FACILITY_GRAPHICS_KERNEL",
};

function ntstatusStructure(value: number): NtstatusStructure {
  const facility = (value >>> 16) & 0xfff;
  return {
    severity: NT_SEVERITY[(value >>> 30) & 0x3],
    customer: ((value >>> 29) & 1) === 1,
    facility: NT_FACILITIES[facility] ?? `FACILITY_0x${facility.toString(16).toUpperCase().padStart(3, "0")}`,
    facilityNum: facility,
    code: value & 0xffff,
  };
}

/** All single-edit variants of a hex string (deletion, transpose, substitution, insertion). */
function editCandidates(s: string): string[] {
  const alpha = "0123456789abcdef";
  const set = new Set<string>();
  for (let i = 0; i < s.length; i++) {
    set.add(s.slice(0, i) + s.slice(i + 1));
    if (i < s.length - 1) set.add(s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2));
    for (const c of alpha) set.add(s.slice(0, i) + c + s.slice(i + 1));
  }
  for (let i = 0; i <= s.length; i++) for (const c of alpha) set.add(s.slice(0, i) + c + s.slice(i));
  set.delete(s);
  return [...set];
}

/** Near-matches (edit distance 1) for a hex-looking token that didn't resolve. */
function suggestions(token: string, data: ErrorData): Suggestion[] {
  const base = token.toLowerCase().replace(/^0x/, "");
  if (base.length < 5 || base.length > 9) return [];
  const hits: { s: Suggestion; diff: number }[] = [];
  const seen = new Set<string>();
  for (const cand of editCandidates(base)) {
    if (cand.length === 0 || cand.length > 8 || !/^[0-9a-f]+$/.test(cand)) continue;
    const val = parseInt(cand, 16) >>> 0;
    const key = "0x" + val.toString(16).padStart(8, "0");
    const nt = data.ntstatus[key]?.[0];
    const h = data.hresult[key]?.[0];
    const pick = nt ? { family: "NTSTATUS" as Family, e: nt } : h ? { family: "HRESULT" as Family, e: h } : null;
    if (!pick) continue;
    const id = pick.family + key + pick.e.name;
    if (seen.has(id)) continue;
    seen.add(id);
    hits.push({
      s: { code: toDisplay(val), family: pick.family, name: pick.e.name, desc: pick.e.desc },
      diff: Math.abs(cand.length - base.length), // prefer same-length (a wrong char) over add/drop
    });
  }
  return hits
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 4)
    .map((h) => h.s);
}

/** Look up a parsed code against the dataset. Pure — the async wrapper supplies data. */
export function lookupError(input: string, data: ErrorData): DecodeResult {
  const t = input.trim().replace(/[,\s]/g, "");
  if (t === "") return { interpretations: [], error: "" };

  let value: number | null = null;
  if (/^0x[0-9a-fA-F]+$/i.test(t)) value = parseInt(t, 16) >>> 0;
  else if (/^-?\d+$/.test(t)) value = Number(t) >>> 0;
  else if (/^[0-9a-fA-F]{1,8}$/.test(t)) value = parseInt(t, 16) >>> 0;

  if (value !== null && Number.isFinite(value)) {
    let interpretations = build(value, data);
    // A bare decimal that matches nothing but is a plausible hex code — try hex too.
    if (interpretations.length === 0 && /^\d{5,8}$/.test(t)) {
      const hv = parseInt(t, 16) >>> 0;
      const alt = build(hv, data);
      if (alt.length) {
        value = hv;
        interpretations = alt;
      }
    }
    const signed = value | 0;
    const hasNt = interpretations.some((i) => i.family === "NTSTATUS");
    const hasWin32 = interpretations.some((i) => i.family === "Win32");
    const hasHresult = interpretations.some((i) => i.family === "HRESULT");
    // Only decode the HRESULT structure when the value really is an HRESULT: a
    // matched HRESULT, or (with no other family match) something HRESULT-shaped.
    const showStruct = hasHresult || (!hasNt && !hasWin32 && looksLikeHresult(value));
    const base = {
      hex: toDisplay(value),
      decimal: String(value >>> 0),
      signed: signed < 0 ? String(signed) : undefined,
      hresultStructure: showStruct ? hresultStructure(value) : undefined,
      ntstatusStructure: hasNt ? ntstatusStructure(value) : undefined,
      error: "",
    };
    if (interpretations.length > 0) return { ...base, interpretations };
    // Parsed to a real value, but no named code matches — nudge + near-matches.
    return { ...base, interpretations: [], suggestions: suggestions(t, data), unrecognized: true };
  }

  // Didn't parse. If it's close to a real code, suggest it; otherwise a format hint.
  const sugg = suggestions(t, data);
  if (sugg.length) return { interpretations: [], suggestions: sugg, unrecognized: true, error: "" };
  return { interpretations: [], error: "Enter an error code as decimal, 0x-hex, or a signed (negative) value." };
}

/** Total number of indexed codes (symbolic names across all three families). */
export function countCodes(data: ErrorData): number {
  const c = (m: Record<string, Entry[]>) =>
    Object.values(m).reduce((n, a) => n + a.length, 0);
  return c(data.ntstatus) + c(data.win32) + c(data.hresult);
}

/** Decode a Windows error code; dynamic-imports the ~1.2 MB code map (cached after first load). */
export async function decodeError(input: string): Promise<DecodeResult> {
  const data = (await import("./data.json")).default as unknown as ErrorData;
  return lookupError(input, data);
}

/** How many codes the bundled dataset indexes — for the tool's stat field. */
export async function getCodeCount(): Promise<number> {
  const data = (await import("./data.json")).default as unknown as ErrorData;
  return countCodes(data);
}
