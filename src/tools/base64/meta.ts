import { Binary } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "base64",
  title: "Base64",
  description: "Encode and decode Base64, with URL-safe and unpadded variants.",
  category: "encoding",
  icon: Binary,
  keywords: ["base64", "b64", "encode", "decode", "url-safe", "atob", "btoa"],
  execution: "client",
  status: "stable",
};
