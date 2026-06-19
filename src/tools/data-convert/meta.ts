import { ArrowRightLeft } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "data-convert",
  title: "Data Convert",
  description: "Convert structured data between JSON, YAML, CSV and TOML.",
  category: "formatting",
  icon: ArrowRightLeft,
  keywords: ["json", "yaml", "csv", "toml", "convert", "transform", "data"],
  execution: "client",
  status: "stable",
};
