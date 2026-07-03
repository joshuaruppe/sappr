import { KeyRound } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "sudoers",
  title: "sudoers",
  description:
    "Analyze a sudoers file (or `sudo -l` output) for privilege-escalation red flags: passwordless ALL rules, wildcards, env tricks and GTFOBins-runnable commands.",
  category: "linux",
  icon: KeyRound,
  keywords: [
    "sudo",
    "sudoers",
    "sudo -l",
    "nopasswd",
    "privesc",
    "privilege escalation",
    "gtfobins",
    "linux",
    "unix",
    "root",
  ],
  execution: "client",
  status: "beta",
};
