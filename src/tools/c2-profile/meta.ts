import { FileSearch } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "c2-profile",
  title: "C2 Profile Linter",
  description:
    "Lint a Cobalt Strike malleable C2 profile: pull out the sleep/jitter, User-Agent, staging, pipe name and GET/POST URIs, and flag common OPSEC red flags (noisy sleep/jitter, staging left on, a default User-Agent or pipe name, the giveaway default certificate). Static analysis, entirely client-side, so the profile never leaves the browser.",
  category: "red-team",
  icon: FileSearch,
  keywords: [
    "c2 profile",
    "malleable",
    "cobalt strike",
    "c2lint",
    "profile",
    "opsec",
    "sleep",
    "jitter",
    "beacon",
    "linter",
  ],
  execution: "client",
  status: "beta",
};
