import { FileDigit } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "file-hash",
  title: "File Hash",
  description: "Hash a file (MD5, SHA-1, SHA-256) streamed in chunks, fully in-browser.",
  category: "crypto",
  icon: FileDigit,
  keywords: ["hash", "checksum", "md5", "sha1", "sha256", "digest", "file", "integrity"],
  execution: "client",
  status: "stable",
};
