import { Activity } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "entropy",
  title: "Entropy Visualizer",
  description:
    "Graph a file's Shannon entropy over its length (and its byte histogram) to spot packed, compressed or encrypted regions — the quick 'is this obfuscated?' check.",
  category: "reversing",
  icon: Activity,
  keywords: [
    "entropy",
    "shannon",
    "packed",
    "packer",
    "encrypted",
    "compressed",
    "obfuscation",
    "histogram",
    "malware",
    "binwalk",
  ],
  execution: "client",
  status: "beta",
};
