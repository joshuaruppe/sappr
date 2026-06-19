import { Clock } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "timestamp",
  title: "Timestamp",
  description: "Convert between Unix epoch and human-readable dates.",
  category: "convert",
  icon: Clock,
  keywords: [
    "timestamp",
    "unix",
    "epoch",
    "date",
    "time",
    "iso",
    "utc",
    "rfc2822",
    "milliseconds",
    "seconds",
  ],
  execution: "client",
  status: "stable",
};
