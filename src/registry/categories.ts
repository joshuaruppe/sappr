import {
  Binary,
  Lock,
  Braces,
  Regex,
  ArrowRightLeft,
  Sparkles,
  Network,
  Microscope,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "./types";

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  /** Short label for tight spaces (nav). */
  short: string;
  description: string;
  icon: LucideIcon;
  /** Lower sorts first. */
  order: number;
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
  },
  crypto: {
    id: "crypto",
    label: "Crypto",
    short: "Crypto",
    description:
      "Hash, HMAC, identify hashes, encrypt/decrypt (AES, XOR) and run classical ciphers, all in your browser.",
    icon: Lock,
    order: 20,
  },
  formatting: {
    id: "formatting",
    label: "Format",
    short: "Format",
    description:
      "Beautify and minify JSON, JS, HTML, CSS and SQL, and convert between JSON, YAML, CSV and TOML.",
    icon: Braces,
    order: 30,
  },
  regex: {
    id: "regex",
    label: "Regex",
    short: "Regex",
    description: "Build, test, explain and visualize regular expressions.",
    icon: Regex,
    order: 40,
  },
  convert: {
    id: "convert",
    label: "Convert",
    short: "Convert",
    description:
      "Timestamps, number bases, text diffs and a Unicode inspector for the conversions you reach for constantly.",
    icon: ArrowRightLeft,
    order: 50,
  },
  generate: {
    id: "generate",
    label: "Generate",
    short: "Generate",
    description: "Generate UUIDs/ULIDs, passwords, random tokens and QR codes.",
    icon: Sparkles,
    order: 60,
  },
  network: {
    id: "network",
    label: "Network",
    short: "Network",
    description: "IP/CIDR math, MAC and user-agent parsing, DNS lookups.",
    icon: Network,
    order: 70,
  },
  forensics: {
    id: "forensics",
    label: "Forensics",
    short: "Forensics",
    description:
      "Pull strings, metadata and hidden data out of files, images and binaries.",
    icon: Microscope,
    order: 80,
  },
};

export const CATEGORY_LIST: CategoryInfo[] = Object.values(CATEGORIES).sort(
  (a, b) => a.order - b.order,
);
