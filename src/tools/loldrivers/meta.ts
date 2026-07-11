import { FileWarning } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "loldrivers",
  title: "Vulnerable Driver Lookup",
  description:
    "Check a Windows driver (by hash or filename) against the public LOLDrivers catalog of known-vulnerable and malicious drivers. Shows its category, flags the ones reported to load despite HVCI, and lists the matching sample hashes. Useful for spotting BYOVD candidates and for triaging a driver you found on a host.",
  category: "red-team",
  icon: FileWarning,
  keywords: [
    "loldrivers",
    "driver",
    "vulnerable driver",
    "byovd",
    "malicious driver",
    "sys",
    "kernel",
    "cve",
    "blocklist",
    "hvci",
  ],
  execution: "client",
  status: "beta",
};
