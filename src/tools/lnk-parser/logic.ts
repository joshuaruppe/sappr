/**
 * Parse a Windows Shell Link (.lnk) per [MS-SHLLINK]. Pure, offline binary
 * parsing: header (flags, attributes, MAC timestamps, show command), LinkInfo
 * (volume serial/label, local base path, UNC network share), the StringData
 * fields (name, relative path, working dir, arguments, icon), and the ExtraData
 * blocks — notably the TrackerDataBlock, which leaks the origin machine's
 * NetBIOS name and MAC address (via the Distributed Link Tracking droid GUIDs).
 * Surfaces forensic red flags (LOLBins, encoded PowerShell, remote payloads).
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface LnkResult {
  flags: string[];
  fileAttributes: string[];
  creationTime?: string;
  accessTime?: string;
  writeTime?: string;
  fileSize: number;
  iconIndex: number;
  showCommand: string;
  hotKey?: string;
  name?: string;
  relativePath?: string;
  workingDir?: string;
  arguments?: string;
  iconLocation?: string;
  targetPath?: string;
  netName?: string;
  volume?: { driveType: string; serial?: string; label?: string };
  tracker?: {
    machineId?: string;
    macAddress?: string;
    droidVolume?: string;
    droidFile?: string;
  };
  extraBlocks: string[];
  findings: Finding[];
  error: string;
}

const EXPECTED_CLSID = "00021401-0000-0000-c000-000000000046";

// LinkFlags (MS-SHLLINK 2.1.1), the useful subset.
const LINK_FLAGS: [number, string][] = [
  [0x00000001, "HasLinkTargetIDList"],
  [0x00000002, "HasLinkInfo"],
  [0x00000004, "HasName"],
  [0x00000008, "HasRelativePath"],
  [0x00000010, "HasWorkingDir"],
  [0x00000020, "HasArguments"],
  [0x00000040, "HasIconLocation"],
  [0x00000080, "IsUnicode"],
  [0x00000100, "ForceNoLinkInfo"],
  [0x00000200, "HasExpString"],
  [0x00000400, "RunInSeparateProcess"],
  [0x00002000, "RunAsUser"],
  [0x00004000, "HasExpIcon"],
  [0x00020000, "RunWithShimLayer"],
  [0x00040000, "ForceNoLinkTrack"],
  [0x00080000, "EnableTargetMetadata"],
];

const FILE_ATTRS: [number, string][] = [
  [0x00000001, "READONLY"],
  [0x00000002, "HIDDEN"],
  [0x00000004, "SYSTEM"],
  [0x00000010, "DIRECTORY"],
  [0x00000020, "ARCHIVE"],
  [0x00000080, "NORMAL"],
  [0x00000100, "TEMPORARY"],
  [0x00000400, "REPARSE_POINT"],
];

const SHOW_COMMANDS: Record<number, string> = {
  1: "SW_SHOWNORMAL",
  3: "SW_SHOWMAXIMIZED",
  7: "SW_SHOWMINNOACTIVE",
};

const DRIVE_TYPES = [
  "UNKNOWN",
  "NO_ROOT_DIR",
  "REMOVABLE",
  "FIXED",
  "REMOTE",
  "CDROM",
  "RAMDISK",
];

const EXTRA_BLOCKS: Record<number, string> = {
  0xa0000001: "EnvironmentVariableDataBlock",
  0xa0000002: "ConsoleDataBlock",
  0xa0000003: "TrackerDataBlock",
  0xa0000004: "ConsoleFEDataBlock",
  0xa0000005: "SpecialFolderDataBlock",
  0xa0000006: "DarwinDataBlock",
  0xa0000007: "IconEnvironmentDataBlock",
  0xa0000008: "ShimDataBlock",
  0xa0000009: "PropertyStoreDataBlock",
  0xa000000b: "KnownFolderDataBlock",
  0xa000000c: "VistaAndAboveIDListDataBlock",
};

// Common living-off-the-land binaries abused by malicious shortcuts.
const LOLBINS =
  /\b(powershell|pwsh|cmd|wscript|cscript|mshta|rundll32|regsvr32|certutil|bitsadmin|msiexec|installutil|forfiles|conhost)(\.exe)?\b/i;

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

function decodeBits(value: number, table: [number, string][]): string[] {
  return table.filter(([bit]) => (value & bit) !== 0).map(([, name]) => name);
}

function filetimeToIso(view: DataView, off: number): string | undefined {
  const v = view.getBigUint64(off, true);
  if (v === 0n) return undefined;
  const ms = v / 10000n - 11644473600000n;
  const n = Number(ms);
  if (!Number.isFinite(n) || n < -8.64e15 || n > 8.64e15) return undefined;
  return new Date(n).toISOString();
}

function guid(bytes: Uint8Array, off: number): string {
  const h = (i: number) => bytes[off + i].toString(16).padStart(2, "0");
  const d1 = `${h(3)}${h(2)}${h(1)}${h(0)}`;
  const d2 = `${h(5)}${h(4)}`;
  const d3 = `${h(7)}${h(6)}`;
  const d4 = `${h(8)}${h(9)}`;
  const d5 = `${h(10)}${h(11)}${h(12)}${h(13)}${h(14)}${h(15)}`;
  return `${d1}-${d2}-${d3}-${d4}-${d5}`;
}

function ansiZ(bytes: Uint8Array, off: number): string {
  let end = off;
  while (end < bytes.length && bytes[end] !== 0) end++;
  return new TextDecoder("latin1").decode(bytes.subarray(off, end));
}

function unicodeZ(bytes: Uint8Array, off: number): string {
  let end = off;
  while (end + 1 < bytes.length && !(bytes[end] === 0 && bytes[end + 1] === 0)) end += 2;
  return new TextDecoder("utf-16le").decode(bytes.subarray(off, end));
}

/** Read a StringData field: CountCharacters (u16) + the string; returns [value, nextOffset]. */
function readStringData(
  bytes: Uint8Array,
  view: DataView,
  off: number,
  unicode: boolean,
): [string, number] {
  const count = view.getUint16(off, true);
  off += 2;
  const byteLen = unicode ? count * 2 : count;
  const slice = bytes.subarray(off, off + byteLen);
  const text = new TextDecoder(unicode ? "utf-16le" : "latin1").decode(slice);
  return [text, off + byteLen];
}

export function parseLnk(bytes: Uint8Array): LnkResult {
  const result: LnkResult = {
    flags: [],
    fileAttributes: [],
    fileSize: 0,
    iconIndex: 0,
    showCommand: "",
    extraBlocks: [],
    findings: [],
    error: "",
  };

  try {
    if (bytes.length < 76) {
      return { ...result, error: "Too small to be a .lnk (need at least a 76-byte header)." };
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    if (view.getUint32(0, true) !== 0x4c) {
      return { ...result, error: "Not a .lnk: HeaderSize is not 0x4C." };
    }
    if (guid(bytes, 4) !== EXPECTED_CLSID) {
      return { ...result, error: "Not a .lnk: LinkCLSID does not match the Shell Link GUID." };
    }

    const flags = view.getUint32(20, true);
    const attrs = view.getUint32(24, true);
    result.flags = decodeBits(flags, LINK_FLAGS);
    result.fileAttributes = decodeBits(attrs, FILE_ATTRS);
    result.creationTime = filetimeToIso(view, 28);
    result.accessTime = filetimeToIso(view, 36);
    result.writeTime = filetimeToIso(view, 44);
    result.fileSize = view.getUint32(52, true);
    result.iconIndex = view.getInt32(56, true);
    const showRaw = view.getUint32(60, true);
    result.showCommand = SHOW_COMMANDS[showRaw] ?? `0x${showRaw.toString(16)}`;
    const hotkey = view.getUint16(64, true);
    if (hotkey) result.hotKey = `0x${hotkey.toString(16)}`;

    const unicode = (flags & 0x80) !== 0;
    let off = 76;

    // LinkTargetIDList — skip (shell item parsing is out of scope), just advance.
    if (flags & 0x01) {
      const idListSize = view.getUint16(off, true);
      off += 2 + idListSize;
    }

    // LinkInfo — volume + local base path + network share.
    if (flags & 0x02 && !(flags & 0x100)) {
      const base = off;
      const linkInfoSize = view.getUint32(base, true);
      const headerSize = view.getUint32(base + 4, true);
      const liFlags = view.getUint32(base + 8, true);
      const volIdOff = view.getUint32(base + 12, true);
      const localPathOff = view.getUint32(base + 16, true);
      const netRelOff = view.getUint32(base + 20, true);
      const suffixOff = view.getUint32(base + 24, true);
      const hasUnicodePaths = headerSize >= 0x24;
      const localPathOffU = hasUnicodePaths ? view.getUint32(base + 28, true) : 0;

      if (liFlags & 0x01 && volIdOff) {
        const v = base + volIdOff;
        const driveType = view.getUint32(v + 4, true);
        const serial = view.getUint32(v + 8, true);
        const labelOff = view.getUint32(v + 12, true);
        result.volume = {
          driveType: DRIVE_TYPES[driveType] ?? `type ${driveType}`,
          serial: serial
            ? `${(serial >>> 16).toString(16).toUpperCase().padStart(4, "0")}-${(serial & 0xffff).toString(16).toUpperCase().padStart(4, "0")}`
            : undefined,
          label: labelOff && labelOff !== 0x14 ? ansiZ(bytes, v + labelOff) : undefined,
        };
      }

      let localPath = "";
      if (liFlags & 0x01 && localPathOffU) localPath = unicodeZ(bytes, base + localPathOffU);
      else if (liFlags & 0x01 && localPathOff) localPath = ansiZ(bytes, base + localPathOff);
      const suffix = suffixOff ? ansiZ(bytes, base + suffixOff) : "";
      if (localPath) result.targetPath = localPath + suffix;

      if (liFlags & 0x02 && netRelOff) {
        const n = base + netRelOff;
        const netNameOff = view.getUint32(n + 8, true);
        if (netNameOff) result.netName = ansiZ(bytes, n + netNameOff) + (suffix ? "\\" + suffix : "");
      }

      off = base + linkInfoSize;
    }

    // StringData (order matters).
    if (flags & 0x04) [result.name, off] = readStringData(bytes, view, off, unicode);
    if (flags & 0x08) [result.relativePath, off] = readStringData(bytes, view, off, unicode);
    if (flags & 0x10) [result.workingDir, off] = readStringData(bytes, view, off, unicode);
    if (flags & 0x20) [result.arguments, off] = readStringData(bytes, view, off, unicode);
    if (flags & 0x40) [result.iconLocation, off] = readStringData(bytes, view, off, unicode);

    // ExtraData blocks.
    while (off + 8 <= bytes.length) {
      const blockSize = view.getUint32(off, true);
      if (blockSize < 8 || off + blockSize > bytes.length) break;
      const sig = view.getUint32(off + 4, true);
      const name = EXTRA_BLOCKS[sig];
      if (name) result.extraBlocks.push(name);

      if (sig === 0xa0000003 && blockSize >= 0x60) {
        // TrackerDataBlock: Length, Version, MachineID(16), Droid(32), DroidBirth(32).
        const machineId = ansiZ(bytes, off + 16);
        const droidOff = off + 32; // after Length(4)+Version(4)+MachineID(16), from block start (+8 header)
        result.tracker = {
          machineId: machineId || undefined,
          droidVolume: guid(bytes, droidOff),
          droidFile: guid(bytes, droidOff + 16),
        };
        // A v1 UUID droid file id carries the origin MAC in its node bytes.
        const versionNibble = bytes[droidOff + 16 + 7] >> 4;
        if (versionNibble === 1) {
          const mac = Array.from({ length: 6 }, (_, i) =>
            bytes[droidOff + 16 + 10 + i].toString(16).padStart(2, "0"),
          ).join(":");
          result.tracker.macAddress = mac;
        }
      }

      if (sig === 0xa0000001 && blockSize >= 0x314 && !result.targetPath) {
        // EnvironmentVariableDataBlock: env-expanded target (ANSI then Unicode).
        const envTarget = ansiZ(bytes, off + 8);
        if (envTarget) result.targetPath = envTarget;
      }

      off += blockSize;
    }

    result.findings = analyzeLnk(result);
    return result;
  } catch (e) {
    return { ...result, error: `Parse error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function analyzeLnk(r: LnkResult): Finding[] {
  const findings: Finding[] = [];
  const target = r.targetPath ?? "";
  const args = r.arguments ?? "";
  const combined = `${target} ${args}`;

  if (LOLBINS.test(combined)) {
    findings.push({
      severity: "high",
      message: "Target or arguments invoke a living-off-the-land binary (powershell/cmd/mshta/rundll32/…) — a hallmark of malicious shortcuts.",
    });
  }
  if (/-e(nc|c|ncodedcommand)?\b|frombase64string|-w\s*(hidden|1)|iex|invoke-expression|downloadstring|downloadfile|-nop|-noni/i.test(args)) {
    findings.push({
      severity: "high",
      message: "Arguments contain encoded/obfuscated PowerShell or a download cradle (e.g. -enc, IEX, DownloadString).",
    });
  }
  if (r.netName || /^\\\\/.test(target)) {
    findings.push({
      severity: "medium",
      message: `Points at a remote UNC/network path (${r.netName ?? target}) — possible remote payload or credential-capture (SMB) lure.`,
    });
  }
  if (args.length > 260) {
    findings.push({ severity: "medium", message: `Unusually long argument string (${args.length} chars) — often obfuscation.` });
  }
  if (r.tracker?.macAddress || r.tracker?.machineId) {
    findings.push({
      severity: "info",
      message: `Origin attribution recovered from the tracker block: ${[r.tracker.machineId && `machine "${r.tracker.machineId}"`, r.tracker.macAddress && `MAC ${r.tracker.macAddress}`].filter(Boolean).join(", ")}.`,
    });
  }
  if (r.volume?.serial) {
    findings.push({ severity: "info", message: `Origin volume serial ${r.volume.serial}${r.volume.label ? ` (label "${r.volume.label}")` : ""}.` });
  }
  return findings;
}
