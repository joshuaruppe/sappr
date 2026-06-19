import { ArrowRightLeft } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "base-convert",
  title: "Number Base",
  description:
    "Convert integers between bases (binary, octal, decimal, hex, or any base 2-36) using BigInt.",
  category: "convert",
  icon: ArrowRightLeft,
  keywords: [
    "base",
    "radix",
    "binary",
    "octal",
    "decimal",
    "hex",
    "hexadecimal",
    "bigint",
    "number",
    "convert",
  ],
  execution: "client",
  status: "stable",
};
