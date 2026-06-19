import { KeySquare } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "hmac",
  title: "HMAC",
  description: "Compute an HMAC over a message with a secret key.",
  category: "crypto",
  icon: KeySquare,
  keywords: ["hmac", "mac", "sha256", "sha1", "sha512", "md5", "signature", "key"],
  execution: "client",
  status: "stable",
};
