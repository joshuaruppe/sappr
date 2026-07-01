import { CalendarClock } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "filetime",
  title: "Windows FILETIME",
  description:
    "Convert a Windows FILETIME (100ns since 1601 — pwdLastSet, lastLogon, accountExpires) to a human date.",
  category: "windows",
  icon: CalendarClock,
  keywords: [
    "filetime",
    "windows time",
    "pwdlastset",
    "lastlogontimestamp",
    "accountexpires",
    "1601",
    "active directory",
    "timestamp",
  ],
  execution: "client",
  status: "beta",
};
