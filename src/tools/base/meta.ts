import { Binary } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "base",
  title: "Base & Hex",
  description:
    "Encode and decode Base64, Base32, Base58 and hex over UTF-8 bytes, with per-format options.",
  category: "encoding",
  icon: Binary,
  keywords: [
    "base",
    "base64",
    "b64",
    "atob",
    "btoa",
    "url-safe",
    "base32",
    "b32",
    "rfc4648",
    "base58",
    "b58",
    "bitcoin",
    "bs58",
    "hex",
    "hexadecimal",
    "base16",
    "encode",
    "decode",
    "bytes",
    "utf-8",
  ],
  execution: "client",
  status: "stable",
};
