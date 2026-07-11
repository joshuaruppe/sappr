import { KeyRound } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "saml",
  title: "SAML",
  description:
    "Decode a SAML AuthnRequest/Response - auto-detecting the HTTP-Redirect (DEFLATE + Base64) or HTTP-POST (Base64) binding - into readable XML, and re-encode into either binding.",
  category: "web",
  icon: KeyRound,
  keywords: [
    "saml",
    "authnrequest",
    "saml response",
    "sso",
    "single sign-on",
    "base64",
    "deflate",
    "inflate",
    "assertion",
    "idp",
    "sp",
    "web",
  ],
  execution: "client",
  status: "beta",
};
