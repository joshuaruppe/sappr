import { KeyRound } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "gpp-cpassword",
  title: "GPP cpassword",
  description:
    "Decrypt a Group Policy Preferences cpassword (Groups.xml and friends) using Microsoft's published AES key. In-browser.",
  category: "windows",
  icon: KeyRound,
  keywords: [
    "gpp",
    "cpassword",
    "group policy preferences",
    "groups.xml",
    "ms14-025",
    "sysvol",
    "aes",
    "decrypt",
  ],
  execution: "client",
  status: "beta",
};
