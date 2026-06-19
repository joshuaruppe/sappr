/**
 * Identify the likely type(s) of an unknown hash and, for credential hashes,
 * say what they are, where they come from, and how to crack them (hashcat /
 * John). Pure functions — no DOM.
 */
import {
  STRUCTURED_DETECTORS,
  HEX_BY_LENGTH,
  type Confidence,
  type HashType,
} from "./data";
import { HASHCAT_MODES } from "./hashcat-modes.generated";

export type { Confidence, HashType } from "./data";

/** hashcat's authoritative mode → {name, example}, pulled via update:hash-defs. */
const HASHCAT_BY_MODE = new Map(HASHCAT_MODES.map((m) => [m.mode, m]));

/** Placeholder shown in the wordlist field (not baked into the command). */
export const DEFAULT_WORDLIST = "/usr/share/wordlists/rockyou.txt";

/**
 * User-tunable flags applied to the generated crack commands. Everything is
 * optional and off by default: a flag/path is only appended once the user fills
 * the corresponding field, so the base command never contains something they'd
 * have to edit out.
 */
export interface CommandOptions {
  /** Wordlist path — appended (positional for hashcat, --wordlist for John). */
  wordlist?: string;
  /** Rules file path — appended as hashcat -r. */
  rules?: string;
  /** hashcat workload profile (-w): 1 Low, 2 Default, 3 High, 4 Nightmare. */
  workload?: number;
  /** hashcat device id(s) (-d), e.g. "1" or "1,2". */
  device?: string;
  /** hashcat optimized kernels (-O). */
  optimized?: boolean;
  /** John CPU process count (--fork). */
  johnFork?: number;
}

export function buildHashcatCommand(mode: number, opts: CommandOptions = {}): string {
  const parts = ["hashcat", "-m", String(mode), "-a", "0"];
  if (opts.workload) parts.push("-w", String(opts.workload));
  if (opts.device) parts.push("-d", opts.device);
  if (opts.optimized) parts.push("-O");
  if (opts.rules) parts.push("-r", opts.rules);
  parts.push("hash.txt");
  if (opts.wordlist) parts.push(opts.wordlist);
  return parts.join(" ");
}

export function buildJohnCommand(format: string, opts: CommandOptions = {}): string {
  const parts = ["john", `--format=${format}`];
  if (opts.johnFork && opts.johnFork > 1) parts.push(`--fork=${opts.johnFork}`);
  if (opts.wordlist) parts.push(`--wordlist=${opts.wordlist}`);
  parts.push("hash.txt");
  return parts.join(" ");
}

export interface IdentifiedHash extends HashType {
  /** hashcat command built with default options (UI may rebuild with flags). */
  hashcatCommand?: string;
  /** John command built with default options. */
  johnCommand?: string;
  /** hashcat's canonical name for this mode (from the bundled hashcat data). */
  hashcatName?: string;
  /** An example hash for this mode (from the bundled hashcat data). */
  hashcatExample?: string;
  /**
   * Set when the input matched this type's marker but is structurally invalid
   * (e.g. right prefix, wrong length) — i.e. it can't actually be cracked as-is.
   */
  warning?: string;
}

const CONF_RANK: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };
const HEX = /^[0-9a-fA-F]+$/;

function enrich(t: HashType, warning?: string): IdentifiedHash {
  const hc = t.hashcatMode !== undefined ? HASHCAT_BY_MODE.get(t.hashcatMode) : undefined;
  return {
    ...t,
    hashcatCommand: t.hashcatMode !== undefined ? buildHashcatCommand(t.hashcatMode) : undefined,
    johnCommand: t.johnFormat ? buildJohnCommand(t.johnFormat) : undefined,
    hashcatName: hc?.name,
    hashcatExample: hc?.example,
    warning,
  };
}

/**
 * Identify likely hash types for `input`, ranked best-first. Structured /
 * credential formats are matched first; otherwise plain hex is classified by
 * length. A detector may flag a match as malformed (right marker, wrong
 * structure) — those sort last and are surfaced with a warning, not commands.
 * Empty input returns [] (no error).
 */
export function identifyHash(input: string): IdentifiedHash[] {
  const s = input.trim();
  if (s === "") return [];

  const out: IdentifiedHash[] = [];
  const seen = new Set<string>();
  const add = (t: HashType, warning?: string) => {
    if (seen.has(t.id)) return;
    seen.add(t.id);
    out.push(enrich(t, warning));
  };

  // 1. Structured / prefixed formats (most specific).
  for (const d of STRUCTURED_DETECTORS) {
    if (!d.match(s)) continue;
    const warning = d.malformedReason?.(s);
    const { match: _m, malformedReason: _mr, ...meta } = d;
    void _m;
    void _mr;
    add(meta, warning);
  }

  // 2. Plain hex, classified by length (ambiguous).
  if (HEX.test(s)) {
    const byLen = HEX_BY_LENGTH[s.length];
    if (byLen) for (const t of byLen) add(t);
  }

  return out.sort((a, b) => {
    // Valid candidates before malformed ones, then by confidence.
    if (!!a.warning !== !!b.warning) return a.warning ? 1 : -1;
    return CONF_RANK[a.confidence] - CONF_RANK[b.confidence];
  });
}
