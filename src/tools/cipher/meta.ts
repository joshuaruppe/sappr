import { KeyRound } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "cipher",
  title: "Classical Ciphers",
  description: "Encode and decode with Vigenere, Atbash, and Rail Fence ciphers.",
  category: "crypto",
  icon: KeyRound,
  keywords: [
    "cipher",
    "vigenere",
    "atbash",
    "rail fence",
    "encrypt",
    "decrypt",
    "classical",
  ],
  execution: "client",
  status: "stable",
};
