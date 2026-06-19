import { KeyRound } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "jwt-decode",
  title: "JWT Decoder",
  description: "Decode a JSON Web Token's header and payload (signature not verified).",
  category: "encoding",
  icon: KeyRound,
  keywords: ["jwt", "json web token", "bearer", "token", "decode", "claims"],
  execution: "client",
  status: "stable",
};
