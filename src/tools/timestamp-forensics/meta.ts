import { CalendarClock } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "timestamp-forensics",
  title: "Forensic Timestamps",
  description:
    "Decode a mystery numeric timestamp across DFIR epoch formats — Unix (s/ms/µs/ns), FILETIME, Chrome/WebKit, Mac/Cocoa, APFS, HFS+, NTP, OLE and packed DOS — and see every plausible date.",
  category: "forensics",
  icon: CalendarClock,
  keywords: [
    "timestamp",
    "epoch",
    "filetime",
    "chrome",
    "webkit",
    "cocoa",
    "mac absolute",
    "apfs",
    "hfs",
    "ntp",
    "ole",
    "dos date",
    "dcode",
    "forensic",
  ],
  execution: "client",
  status: "beta",
};
