import { ShieldAlert } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "security-descriptor",
  title: "Security Descriptor",
  description:
    "Decode a Windows SECURITY_DESCRIPTOR (Base64 or hex) into readable owner, group and ACL entries, plus its SDDL.",
  category: "windows",
  icon: ShieldAlert,
  keywords: [
    "security descriptor",
    "sddl",
    "acl",
    "dacl",
    "sacl",
    "ace",
    "sid",
    "ntsecuritydescriptor",
    "ntsd",
    "permissions",
    "active directory",
    "ad",
  ],
  execution: "client",
  status: "beta",
};
