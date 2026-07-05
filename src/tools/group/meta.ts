import { UsersRound } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "group",
  title: "/etc/group",
  description:
    "Parse /etc/group and flag membership in privilege-escalation groups: docker, lxd, disk, shadow (≈ instant root), plus sudo/wheel/adm.",
  category: "linux",
  icon: UsersRound,
  keywords: [
    "group",
    "etc/group",
    "groups",
    "docker",
    "lxd",
    "disk",
    "shadow",
    "sudo",
    "wheel",
    "privesc",
    "privilege escalation",
    "linux",
    "unix",
  ],
  execution: "client",
  status: "beta",
};
