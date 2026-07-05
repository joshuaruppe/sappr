import { CalendarClock } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "filetime",
  title: "FILETIME / Integer8",
  description:
    "Convert a Windows FILETIME or AD Integer8 value: absolute times (file times, lastLogonTimestamp, pwdLastSet) and negative durations (maxPwdAge, lockoutDuration), with the 'never' sentinels.",
  category: "windows",
  icon: CalendarClock,
  keywords: [
    "filetime",
    "integer8",
    "largeinteger",
    "windows time",
    "100-nanosecond",
    "1601",
    "pwdlastset",
    "lastlogontimestamp",
    "maxpwdage",
    "lockoutduration",
    "accountexpires",
    "timestamp",
    "duration",
    "active directory",
    "ad",
  ],
  execution: "client",
  status: "beta",
};
