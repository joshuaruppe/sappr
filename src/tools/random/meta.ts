import { Dices } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "random",
  title: "Random Token",
  description: "Generate cryptographically-random tokens, keys and integers.",
  category: "generate",
  icon: Dices,
  keywords: [
    "random",
    "token",
    "key",
    "secret",
    "uuid",
    "bytes",
    "nonce",
    "csprng",
    "crypto",
    "integer",
    "dice",
  ],
  execution: "client",
  status: "stable",
};
