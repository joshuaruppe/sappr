import { Router } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "mac-oui",
  title: "MAC Vendor Lookup",
  description:
    "Paste MAC addresses (or whole `arp -a` / `ip neigh` dumps) and resolve each to its IEEE-registered vendor, plus decode the unicast/multicast and universal/local bits, flagging randomized or private MACs (iOS/Android privacy, VMs) that have no real hardware vendor.",
  category: "network",
  icon: Router,
  keywords: [
    "mac",
    "oui",
    "vendor",
    "manufacturer",
    "ieee",
    "ma-l",
    "nic",
    "ethernet",
    "hardware address",
    "arp",
    "randomized mac",
    "locally administered",
    "multicast",
  ],
  execution: "client",
  status: "beta",
};
