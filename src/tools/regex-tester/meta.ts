import { Regex } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "regex-tester",
  title: "Regex Tester",
  description:
    "Test a JavaScript regex against text with live match highlighting.",
  category: "regex",
  icon: Regex,
  keywords: ["regex", "regexp", "pattern", "match", "test", "regular expression"],
  execution: "client",
  status: "stable",
};
