import { FileSymlink } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "lnk-parser",
  title: "LNK Parser",
  description:
    "Parse a Windows .lnk shortcut (MS-SHLLINK): target, arguments, timestamps, volume serial, network share, and the tracker block that leaks the origin machine name + MAC address.",
  category: "forensics",
  icon: FileSymlink,
  keywords: [
    "lnk",
    "shortcut",
    "shell link",
    "shllink",
    "lecmd",
    "shortcut malware",
    "distributed link tracking",
    "mac address",
    "dfir",
    "windows",
  ],
  execution: "client",
  status: "beta",
};
