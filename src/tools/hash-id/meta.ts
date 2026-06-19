import { Fingerprint } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "hash-id",
  title: "Hash Identifier",
  description:
    "Guess the type of an unknown hash from its length, charset and prefix.",
  category: "crypto",
  icon: Fingerprint,
  keywords: [
    "hash",
    "identify",
    "hashid",
    "hash-identifier",
    "md5",
    "sha",
    "bcrypt",
    "ntlm",
    "crc32",
  ],
  execution: "client",
  status: "stable",
};
