import { Cog } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "systemd-unit",
  title: "systemd Unit",
  description:
    "Analyze a systemd .service unit for persistence and privesc red flags: root service running a writable/relative ExecStart, User= bypass, secrets in Environment=, missing sandboxing.",
  category: "linux",
  icon: Cog,
  keywords: [
    "systemd",
    "unit",
    "service",
    "execstart",
    "persistence",
    "privesc",
    "privilege escalation",
    "hardening",
    "nonewprivileges",
    "linux",
    "unix",
  ],
  execution: "client",
  status: "beta",
};
