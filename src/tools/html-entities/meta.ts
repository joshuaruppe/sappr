import { Code } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "html-entities",
  title: "HTML Entities",
  description: "Encode and decode HTML entities, with named references.",
  category: "encoding",
  icon: Code,
  keywords: ["html", "entities", "escape", "unescape", "encode", "decode", "&amp;", "named references"],
  execution: "client",
  status: "stable",
};
