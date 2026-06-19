import { Hash } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "hash-text",
  title: "Hash Text",
  description: "Compute many digests of the input text at once.",
  category: "crypto",
  icon: Hash,
  keywords: [
    "hash",
    "digest",
    "md5",
    "sha",
    "sha256",
    "sha512",
    "sha3",
    "keccak",
    "ripemd160",
    "blake2b",
    "crc32",
    "checksum",
  ],
  execution: "client",
  status: "stable",
};
