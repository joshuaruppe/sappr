import { Lock } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "aes",
  title: "AES Encrypt / Decrypt",
  description:
    "Symmetric AES (GCM or CBC) in the browser via the Web Crypto API.",
  category: "crypto",
  icon: Lock,
  keywords: [
    "aes",
    "encrypt",
    "decrypt",
    "gcm",
    "cbc",
    "pbkdf2",
    "cipher",
    "symmetric",
    "crypto",
    "passphrase",
  ],
  execution: "client",
  status: "beta",
};
