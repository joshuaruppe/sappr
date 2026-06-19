import { Type } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "unicode",
  title: "Unicode Inspector",
  description:
    "Inspect every character: code points, UTF-8 bytes, escapes and hidden/suspicious flags.",
  category: "convert",
  icon: Type,
  keywords: [
    "unicode",
    "codepoint",
    "code point",
    "utf-8",
    "utf8",
    "character",
    "glyph",
    "escape",
    "zero-width",
    "invisible",
    "hidden",
    "homoglyph",
    "emoji",
    "inspect",
  ],
  execution: "client",
  status: "stable",
};
