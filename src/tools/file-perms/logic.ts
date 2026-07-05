/**
 * Decode Unix file modes between octal and symbolic form, spell out the
 * special bits (setuid/setgid/sticky), and flag dangerous combinations. Also a
 * umask calculator. Pure — no DOM.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface PermClass {
  read: boolean;
  write: boolean;
  execute: boolean;
}

export interface ParsedMode {
  /** 4-digit octal including the special-bit digit, e.g. "4755". */
  octal: string;
  /** 9-char symbolic, e.g. "rwsr-xr-x". */
  symbolic: string;
  /** ls-style with a leading type placeholder, e.g. "-rwsr-xr-x". */
  ls: string;
  owner: PermClass;
  group: PermClass;
  other: PermClass;
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
}

export interface ModeResult {
  mode: ParsedMode | null;
  findings: Finding[];
  error: string;
}

function classFromDigit(d: number): PermClass {
  return { read: (d & 4) !== 0, write: (d & 2) !== 0, execute: (d & 1) !== 0 };
}

function digitFromClass(c: PermClass): number {
  return (c.read ? 4 : 0) + (c.write ? 2 : 0) + (c.execute ? 1 : 0);
}

function symbolicTriad(c: PermClass, special: "suid" | "sgid" | "sticky" | null): string {
  const r = c.read ? "r" : "-";
  const w = c.write ? "w" : "-";
  let x: string;
  if (special === "suid" || special === "sgid") {
    x = c.execute ? "s" : "S";
  } else if (special === "sticky") {
    x = c.execute ? "t" : "T";
  } else {
    x = c.execute ? "x" : "-";
  }
  return r + w + x;
}

function build(
  owner: PermClass,
  group: PermClass,
  other: PermClass,
  setuid: boolean,
  setgid: boolean,
  sticky: boolean,
): ParsedMode {
  const special = (setuid ? 4 : 0) + (setgid ? 2 : 0) + (sticky ? 1 : 0);
  const octal = `${special}${digitFromClass(owner)}${digitFromClass(group)}${digitFromClass(other)}`;
  const symbolic =
    symbolicTriad(owner, setuid ? "suid" : null) +
    symbolicTriad(group, setgid ? "sgid" : null) +
    symbolicTriad(other, sticky ? "sticky" : null);
  return { octal, symbolic, ls: `-${symbolic}`, owner, group, other, setuid, setgid, sticky };
}

const SYMBOLIC_RE =
  /^[-r][-w][-xsS][-r][-w][-xsS][-r][-w][-xtT]$/;

function parseSymbolic(sym: string): ParsedMode {
  const owner = { read: sym[0] === "r", write: sym[1] === "w", execute: sym[2] === "x" || sym[2] === "s" };
  const group = { read: sym[3] === "r", write: sym[4] === "w", execute: sym[5] === "x" || sym[5] === "s" };
  const other = { read: sym[6] === "r", write: sym[7] === "w", execute: sym[8] === "x" || sym[8] === "t" };
  const setuid = sym[2] === "s" || sym[2] === "S";
  const setgid = sym[5] === "s" || sym[5] === "S";
  const sticky = sym[8] === "t" || sym[8] === "T";
  return build(owner, group, other, setuid, setgid, sticky);
}

function findingsFor(m: ParsedMode): Finding[] {
  const out: Finding[] = [];
  if (m.setuid && m.other.write) {
    out.push({
      severity: "high",
      message: "World-writable setuid file — anyone can replace it and run code as its owner.",
    });
  } else if (m.setuid) {
    out.push({
      severity: "medium",
      message: "setuid bit — runs with the file owner's privileges (root-owned = privilege-escalation target).",
    });
  }
  if (m.setgid) {
    out.push({ severity: "info", message: "setgid bit — runs with the file group's privileges." });
  }
  if (m.other.write && !m.setuid) {
    out.push({ severity: "medium", message: "World-writable — any user can modify this file." });
  }
  if (m.sticky) {
    out.push({
      severity: "info",
      message: "Sticky bit — on a directory, only owners can delete their own files (e.g. /tmp).",
    });
  }
  return out;
}

/** Parse an octal ("755", "4755") or symbolic ("rwxr-xr-x", "-rwsr-xr-x") mode. */
export function parseMode(input: string): ModeResult {
  const s = input.trim();
  if (s === "") return { mode: null, findings: [], error: "" };

  if (/^[0-7]{3,4}$/.test(s)) {
    const padded = s.length === 3 ? `0${s}` : s;
    const special = parseInt(padded[0], 8);
    const mode = build(
      classFromDigit(parseInt(padded[1], 8)),
      classFromDigit(parseInt(padded[2], 8)),
      classFromDigit(parseInt(padded[3], 8)),
      (special & 4) !== 0,
      (special & 2) !== 0,
      (special & 1) !== 0,
    );
    return { mode, findings: findingsFor(mode), error: "" };
  }

  // Symbolic: accept the bare 9-char form or a 10-char ls form with a type char.
  const sym = s.length === 10 ? s.slice(1) : s;
  if (sym.length === 9 && SYMBOLIC_RE.test(sym)) {
    const mode = parseSymbolic(sym);
    return { mode, findings: findingsFor(mode), error: "" };
  }

  return {
    mode: null,
    findings: [],
    error: "Enter an octal mode (e.g. 755 or 4755) or symbolic mode (e.g. rwxr-xr-x or -rwsr-xr-x).",
  };
}

// --- ls -l listing ------------------------------------------------------------

export interface ListingEntry {
  raw: string;
  /** File-type character: - d l b c p s. */
  type: string;
  typeLabel: string;
  name: string;
  /** Symlink target, if the entry is a symlink. */
  target?: string;
  owner: string;
  group: string;
  size: string;
  mode: ParsedMode;
  /** Per-entry concerns (empty if nothing notable). */
  concerns: Finding[];
}

export interface ListingResult {
  entries: ListingEntry[];
  /** All concerns across every entry, name-tagged and severity-sorted. */
  findings: Finding[];
  error: string;
}

const TYPE_LABELS: Record<string, string> = {
  "-": "file",
  d: "directory",
  l: "symlink",
  b: "block device",
  c: "char device",
  p: "fifo",
  s: "socket",
};

// A full ls-style mode token: type char + 9 structured perm chars + optional
// ACL/SELinux/xattr marker (. + @).
const MODE_TOKEN_RE = /^[-dlbcps][-r][-w][-xsS][-r][-w][-xsS][-r][-w][-xtT][.+@]?$/;

const SEV_RANK_L: Record<Severity, number> = { high: 0, medium: 1, info: 2 };

function listingConcerns(entry: {
  type: string;
  mode: ParsedMode;
  owner: string;
  name: string;
}): Finding[] {
  const { type, mode, owner, name } = entry;
  // Symlink permission bits are always rwxrwxrwx and ignored by the kernel —
  // never flag them.
  if (type === "l") return [];

  const out: Finding[] = [];
  if (mode.setuid) {
    out.push({
      severity: type === "-" ? "medium" : "info",
      message: `setuid ${TYPE_LABELS[type] ?? "file"} "${name}" — runs as its owner${owner ? ` (${owner})` : ""}.`,
    });
  }
  if (mode.setgid) {
    out.push({ severity: "info", message: `setgid "${name}" — runs with its group.` });
  }
  if (mode.other.write) {
    if (type === "d" && mode.sticky) {
      out.push({
        severity: "info",
        message: `"${name}" is world-writable but sticky — normal for shared temp dirs.`,
      });
    } else {
      out.push({
        severity: "high",
        message: `World-writable ${TYPE_LABELS[type] ?? "file"}: "${name}".`,
      });
    }
  }
  return out;
}

function parseListingLine(line: string): ListingEntry | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 4) return null;

  const mi = tokens.findIndex((t) => MODE_TOKEN_RE.test(t));
  if (mi === -1) return null;

  const modeTok = tokens[mi];
  const type = modeTok[0];
  const parsed = parseMode(modeTok.slice(1, 10)).mode;
  if (!parsed) return null;

  // Columns after the mode: links owner group size [maj min] date(3) name.
  // Block/char devices carry a "major, minor" size, which some `ls` builds
  // print split ("1," "3") and others combined ("1,3"). Only the split form
  // consumes an extra token.
  const isDevice = type === "b" || type === "c";
  const deviceExtra = isDevice && /,$/.test(tokens[mi + 4] ?? "") ? 1 : 0;
  const owner = tokens[mi + 2] ?? "";
  const group = tokens[mi + 3] ?? "";
  const size = tokens.slice(mi + 4, mi + 5 + deviceExtra).join(" ");

  const nameIndex = mi + 8 + deviceExtra;
  let name = tokens.slice(nameIndex).join(" ");
  let target: string | undefined;
  const arrow = name.indexOf(" -> ");
  if (arrow !== -1) {
    target = name.slice(arrow + 4);
    name = name.slice(0, arrow);
  }
  if (name === "") return null;

  const concerns = listingConcerns({ type, mode: parsed, owner, name });
  return {
    raw: line.trim(),
    type,
    typeLabel: TYPE_LABELS[type] ?? "file",
    name,
    target,
    owner,
    group,
    size,
    mode: parsed,
    concerns,
  };
}

/** Parse a pasted `ls -l` / `ls -la` / `ls -ls` listing. Leading block-size
 * columns and the `total N` header are tolerated. */
export function parseListing(input: string): ListingResult {
  const empty: ListingResult = { entries: [], findings: [], error: "" };
  const text = input.trim();
  if (text === "") return empty;

  const entries: ListingEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const entry = parseListingLine(line);
    if (entry) entries.push(entry);
  }

  if (entries.length === 0) {
    return {
      ...empty,
      error: "No ls -l entries found. Paste output like `drwxr-xr-x 2 root root 4096 … name`.",
    };
  }

  const findings = entries
    .flatMap((e) => e.concerns)
    .sort((a, b) => SEV_RANK_L[a.severity] - SEV_RANK_L[b.severity]);
  return { entries, findings, error: "" };
}
