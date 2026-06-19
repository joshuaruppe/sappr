import { GitCompare } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "diff",
  title: "Text Diff",
  description: "Compare two texts by line, word, or character.",
  category: "convert",
  icon: GitCompare,
  keywords: ["diff", "compare", "text", "changes", "delta", "merge"],
  execution: "client",
  status: "stable",
};
