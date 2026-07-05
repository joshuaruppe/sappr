import { Fingerprint } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "sid",
  title: "SID Decoder",
  description:
    "Decode a Windows SID between string and binary form, resolve well-known SIDs and RIDs (Administrator, Domain Admins, krbtgt…), and break out authority and sub-authorities.",
  category: "windows",
  icon: Fingerprint,
  keywords: [
    "sid",
    "security identifier",
    "rid",
    "well-known sid",
    "domain admins",
    "krbtgt",
    "s-1-5-21",
    "s-1-5-32",
    "active directory",
    "ad",
    "windows",
  ],
  execution: "client",
  status: "beta",
};
