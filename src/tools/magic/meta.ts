import { Wand2 } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "magic",
  title: "Magic (Auto-Decode)",
  description:
    "Throw an unknown blob in and auto-detect the decoding. Ranks likely Base64, hex, ROT, URL and more.",
  category: "encoding",
  icon: Wand2,
  keywords: [
    "magic",
    "auto",
    "detect",
    "decode",
    "cyberchef",
    "base64",
    "base32",
    "hex",
    "rot13",
    "rot47",
    "url",
    "unknown",
  ],
  execution: "client",
  status: "beta",
};
