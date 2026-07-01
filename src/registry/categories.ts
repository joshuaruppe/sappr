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
    description: "IP/CIDR math, MAC and user-agent parsing, DNS lookups.",
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
};

export const CATEGORY_LIST: CategoryInfo[] = Object.values(CATEGORIES).sort(
  (a, b) => a.order - b.order,
);
