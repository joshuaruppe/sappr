import { Users } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "passwd",
  title: "passwd / shadow",
  description:
    "Parse /etc/passwd and /etc/shadow into accounts and flag privilege-escalation red flags (UID 0, empty or unshadowed passwords, weak hash schemes, duplicate UIDs).",
  category: "linux",
  icon: Users,
  keywords: [
    "passwd",
    "shadow",
    "etc/passwd",
    "etc/shadow",
    "accounts",
    "uid",
    "gid",
    "unix",
    "linux",
    "privesc",
    "crypt",
    "yescrypt",
    "sha512crypt",
  ],
  execution: "client",
  status: "beta",
};
