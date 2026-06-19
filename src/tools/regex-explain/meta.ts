import { Regex } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "regex-explain",
  title: "Regex Explain",
  description: "Explain a regular expression in plain English by walking its AST.",
  category: "regex",
  icon: Regex,
  keywords: [
    "regex",
    "regexp",
    "explain",
    "describe",
    "ast",
    "pattern",
    "plain english",
  ],
  execution: "client",
  status: "beta",
};
