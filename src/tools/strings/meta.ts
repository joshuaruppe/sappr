import { ScanText } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "strings",
  title: "Strings",
  description:
    "Extract printable strings from a file or binary, like the unix 'strings' command.",
  category: "forensics",
  icon: ScanText,
  keywords: ["strings", "binary", "ascii", "utf-16", "extract", "dump", "hex"],
  execution: "client",
  status: "stable",
};
