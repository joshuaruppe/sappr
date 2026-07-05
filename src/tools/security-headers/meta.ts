import { ShieldCheck } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "security-headers",
  title: "Security Headers",
  description:
    "Analyze a pasted HTTP response header block: grade CSP, HSTS, framing, cookie flags and info-leak headers, and flag what's missing or misconfigured.",
  category: "web",
  icon: ShieldCheck,
  keywords: [
    "security headers",
    "http headers",
    "csp",
    "content-security-policy",
    "hsts",
    "x-frame-options",
    "cookie flags",
    "httponly",
    "samesite",
    "clickjacking",
    "web",
  ],
  execution: "client",
  status: "beta",
};
