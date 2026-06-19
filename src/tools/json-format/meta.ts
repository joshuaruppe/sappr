import { Braces } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "json-format",
  title: "JSON Format",
  description: "Pretty-print, minify and validate JSON.",
  category: "formatting",
  icon: Braces,
  keywords: ["json", "format", "beautify", "pretty", "minify", "validate", "indent", "sort"],
  execution: "client",
  status: "stable",
};
