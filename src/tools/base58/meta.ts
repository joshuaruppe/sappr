import { Binary } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "base58",
  title: "Base58",
  description: "Encode and decode Base58 (Bitcoin alphabet) over UTF-8 bytes.",
  category: "encoding",
  icon: Binary,
  keywords: ["base58", "b58", "bitcoin", "encode", "decode", "bs58"],
  execution: "client",
  status: "stable",
};
