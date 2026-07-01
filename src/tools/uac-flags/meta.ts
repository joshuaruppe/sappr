import { UserCog } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "uac-flags",
  title: "userAccountControl",
  description:
    "Decode a Windows/AD userAccountControl value into its named flags — spot delegation, AS-REP roastable, disabled and more.",
  category: "windows",
  icon: UserCog,
  keywords: [
    "uac",
    "useraccountcontrol",
    "account flags",
    "delegation",
    "asrep roast",
    "preauth",
    "active directory",
    "ad",
  ],
  execution: "client",
  status: "beta",
};
