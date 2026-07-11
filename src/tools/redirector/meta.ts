import { Split } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "redirector",
  title: "Redirector Generator",
  description:
    "Generate nginx and Apache mod_rewrite C2 redirector configs from a Cobalt Strike malleable profile (or manual URIs + User-Agent): forward matching beacon traffic to your team server and 302 everything else to a decoy. Runs entirely client-side, so your profile and team-server address never leave the browser.",
  category: "red-team",
  icon: Split,
  keywords: [
    "redirector",
    "c2",
    "cobalt strike",
    "malleable",
    "profile",
    "nginx",
    "apache",
    "mod_rewrite",
    "reverse proxy",
    "team server",
    "decoy",
    "cs2modrewrite",
    "cs2nginx",
  ],
  execution: "client",
  status: "beta",
};
