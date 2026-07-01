import { Ticket } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "kerberos-ticket",
  title: "Kerberos Ticket",
  description:
    "Decode a Kerberos .kirbi / KRB-CRED (Rubeus, Mimikatz) into its service, client, flags, validity and session key.",
  category: "windows",
  icon: Ticket,
  keywords: [
    "kerberos",
    "kirbi",
    "krb-cred",
    "tgt",
    "tgs",
    "ticket",
    "rubeus",
    "mimikatz",
    "pass-the-ticket",
    "ptt",
    "session key",
    "asktgt",
  ],
  execution: "client",
  status: "beta",
};
