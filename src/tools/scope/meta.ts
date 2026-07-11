import { Crosshair } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "scope",
  title: "Scope Cleanup",
  description:
    "Turn a messy engagement scope (mixed CIDRs, ranges, single IPs, URLs, ports, IPv6 and hostnames, with dupes) into a clean, deduped target list: every host one-per-line for `nmap -iL`, minimal collapsed CIDRs, or a single nmap-ready target string.",
  category: "network",
  icon: Crosshair,
  keywords: [
    "scope",
    "cleanup",
    "normalize",
    "targets",
    "cidr",
    "subnet",
    "ip range",
    "nmap",
    "iL",
    "expand",
    "collapse",
    "aggregate",
    "supernet",
    "dedupe",
    "hosts",
    "target list",
  ],
  execution: "client",
  status: "beta",
};
