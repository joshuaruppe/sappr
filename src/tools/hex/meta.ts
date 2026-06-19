import { Binary } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "hex",
  title: "Hex",
  description: "Convert text to and from hexadecimal (UTF-8 bytes).",
  category: "encoding",
  icon: Binary,
  keywords: ["hex", "hexadecimal", "base16", "encode", "decode", "bytes", "utf-8"],
  execution: "client",
  status: "stable",
};
