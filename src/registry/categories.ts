import {
  Binary,
  Lock,
  Braces,
  Regex,
  ArrowRightLeft,
  Sparkles,
  Network,
  Microscope,
  AppWindow,
  Terminal,
  Globe,
  Cpu,
  Swords,
  Blocks,
  ShieldHalf,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "./types";

/** Top-level menu groups that bundle general-purpose categories together. */
export type MenuGroupId = "data" | "security";

export interface MenuGroupInfo {
  id: MenuGroupId;
  label: string;
  icon: LucideIcon;
  order: number;
}

export const MENU_GROUPS: MenuGroupInfo[] = [
  { id: "data", label: "Data", icon: Blocks, order: 10 },
  { id: "security", label: "Security", icon: ShieldHalf, order: 20 },
];

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  /** Short label for tight spaces (nav). */
  short: string;
  description: string;
  icon: LucideIcon;
  /** Lower sorts first (within a group, or among top-level entries). */
  order: number;
  /**
   * Menu group this category is bundled under. Categories with no group (domain
   * menus like Windows) render as their own top-level menu.
   */
  group?: MenuGroupId;
}

export const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  encoding: {
    id: "encoding",
    label: "Encode / Decode",
    short: "Encode",
    description:
      "Convert between Base64/32/58, hex, URL, HTML entities and more, including JWT decode and a 'Magic' auto-decoder.",
    icon: Binary,
    order: 10,
    group: "data",
  },
  crypto: {
    id: "crypto",
    label: "Crypto",
    short: "Crypto",
    description:
      "Hash, HMAC, identify hashes, encrypt/decrypt (AES, XOR) and run classical ciphers, all in your browser.",
    icon: Lock,
    order: 20,
    group: "security",
  },
  formatting: {
    id: "formatting",
    label: "Format",
    short: "Format",
    description:
      "Beautify and minify JSON, JS, HTML, CSS and SQL, and convert between JSON, YAML, CSV and TOML.",
    icon: Braces,
    order: 30,
    group: "data",
  },
  regex: {
    id: "regex",
    label: "Regex",
    short: "Regex",
    description: "Build, test, explain and visualize regular expressions.",
    icon: Regex,
    order: 40,
    group: "data",
  },
  convert: {
    id: "convert",
    label: "Convert",
    short: "Convert",
    description:
      "Timestamps, number bases, text diffs and a Unicode inspector for the conversions you reach for constantly.",
    icon: ArrowRightLeft,
    order: 50,
    group: "data",
  },
  generate: {
    id: "generate",
    label: "Generate",
    short: "Generate",
    description: "Generate UUIDs/ULIDs, passwords, random tokens and QR codes.",
    icon: Sparkles,
    order: 60,
    group: "data",
  },
  network: {
    id: "network",
    label: "Network",
    short: "Network",
    description:
      "Turn a messy engagement scope into a clean, deduped target list (expand, collapse to CIDRs, or an nmap-ready string), and resolve MAC addresses to their IEEE-registered vendor.",
    icon: Network,
    order: 70,
    group: "security",
  },
  forensics: {
    id: "forensics",
    label: "Forensics",
    short: "Forensics",
    description:
      "Pull strings, metadata and hidden data out of files, images and binaries.",
    icon: Microscope,
    order: 80,
    group: "security",
  },
  windows: {
    id: "windows",
    label: "Windows",
    short: "Windows",
    description:
      "Decode Windows-specific structures like security descriptors, SDDL and SIDs.",
    icon: AppWindow,
    order: 90,
  },
  linux: {
    id: "linux",
    label: "Linux",
    short: "Linux",
    description:
      "Triage Linux/Unix loot: parse passwd/shadow, sudoers, file permissions and crontabs, and surface privilege-escalation red flags.",
    icon: Terminal,
    order: 100,
  },
  web: {
    id: "web",
    label: "Web",
    short: "Web",
    description:
      "Web-app pentest decoders: SAML messages, HTTP security headers/CSP, signed session cookies and serialized-object blobs.",
    icon: Globe,
    order: 110,
  },
  reversing: {
    id: "reversing",
    label: "Reversing",
    short: "Reversing",
    description:
      "Reverse-engineering & binary analysis in the browser: ELF/PE/Mach-O parsers, a multi-arch disassembler, entropy visualization and ASN.1/DER decoding.",
    icon: Cpu,
    order: 120,
  },
  "red-team": {
    id: "red-team",
    label: "Red Team",
    short: "Red Team",
    description:
      "Offensive infrastructure utilities: generate C2 redirector configs for nginx and Apache from a malleable profile.",
    icon: Swords,
    order: 130,
  },
};

export const CATEGORY_LIST: CategoryInfo[] = Object.values(CATEGORIES).sort(
  (a, b) => a.order - b.order,
);
