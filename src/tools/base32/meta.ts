import { Binary } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "base32",
  title: "Base32",
  description: "Encode and decode RFC 4648 Base32 over UTF-8 bytes.",
  category: "encoding",
  icon: Binary,
  keywords: ["base32", "b32", "encode", "decode", "rfc4648"],
  execution: "client",
  status: "stable",
};
