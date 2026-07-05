import { Zap } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "capabilities",
  title: "Linux Capabilities",
  description:
    "Decode Linux file capabilities (getcap output) into plain meaning and flag the ones that grant privilege escalation — cap_setuid, cap_dac_read_search, cap_sys_admin…",
  category: "linux",
  icon: Zap,
  keywords: [
    "capabilities",
    "getcap",
    "setcap",
    "cap_setuid",
    "cap_sys_admin",
    "cap_dac_read_search",
    "cap_net_raw",
    "privesc",
    "privilege escalation",
    "linux",
    "unix",
  ],
  execution: "client",
  status: "beta",
};
