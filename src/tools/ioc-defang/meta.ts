import { Radar } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "ioc-defang",
  title: "IOC Defang / Refang",
  description:
    "Defang indicators for safe sharing (hxxp, [.], [@]) or refang them back to live form, and extract URLs, IPs, domains, emails and hashes from a blob.",
  category: "forensics",
  icon: Radar,
  keywords: [
    "ioc",
    "defang",
    "refang",
    "fang",
    "indicator of compromise",
    "threat intel",
    "hxxp",
    "extract",
    "url",
    "hash",
    "phishing",
    "safelink",
  ],
  execution: "client",
  status: "beta",
};
