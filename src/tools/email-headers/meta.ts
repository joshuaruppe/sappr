import { MailSearch } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "email-headers",
  title: "Email Header Analyzer",
  description:
    "Paste raw email headers and trace the delivery path: the Received hop chain with per-hop delays, the SPF/DKIM/DMARC results, and the key envelope headers. Flags the classic phishing tells (auth failures, and From vs Return-Path / Reply-To domain mismatches). Runs entirely client-side.",
  category: "forensics",
  icon: MailSearch,
  keywords: [
    "email",
    "headers",
    "received",
    "spf",
    "dkim",
    "dmarc",
    "phishing",
    "spoofing",
    "message-id",
    "authentication-results",
    "hops",
  ],
  execution: "client",
  status: "beta",
};
