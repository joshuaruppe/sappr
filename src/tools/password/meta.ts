import { KeyRound } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "password",
  title: "Password Generator",
  description:
    "Generate strong, random passwords with crypto-grade entropy and configurable character sets.",
  category: "generate",
  icon: KeyRound,
  keywords: [
    "password",
    "passphrase",
    "random",
    "secret",
    "generate",
    "entropy",
    "secure",
  ],
  execution: "client",
  status: "stable",
};
