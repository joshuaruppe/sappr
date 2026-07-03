import { FileLock2 } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "file-perms",
  title: "File Permissions",
  description:
    "Triage a pasted `ls -l` listing for concerning permissions (world-writable, setuid), with per-class r/w/x tags and octal ↔ symbolic breakdowns including setuid/setgid/sticky.",
  category: "linux",
  icon: FileLock2,
  keywords: [
    "chmod",
    "permissions",
    "file mode",
    "ls -l",
    "ls -la",
    "listing",
    "octal",
    "symbolic",
    "rwx",
    "setuid",
    "setgid",
    "suid",
    "sgid",
    "sticky",
    "world-writable",
    "755",
    "linux",
    "unix",
  ],
  execution: "client",
  status: "beta",
};
