import { Database } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "sql-format",
  title: "SQL Format",
  description: "Pretty-print SQL with dialect, keyword case and indent options.",
  category: "formatting",
  icon: Database,
  keywords: ["sql", "format", "prettify", "beautify", "query", "postgres", "mysql"],
  execution: "client",
  status: "stable",
};
