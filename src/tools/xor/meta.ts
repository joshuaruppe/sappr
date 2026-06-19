import { KeyRound } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "xor",
  title: "XOR",
  description:
    "Repeating-key XOR cipher with multi-format I/O, plus single-byte brute force.",
  category: "crypto",
  icon: KeyRound,
  keywords: [
    "xor",
    "cipher",
    "key",
    "brute force",
    "single-byte",
    "crypto",
    "ctf",
  ],
  execution: "client",
  status: "stable",
};
