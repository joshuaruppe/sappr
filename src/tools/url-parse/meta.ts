import { Link } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "url-parse",
  title: "URL Parser",
  description: "Break a URL into its parts: protocol, host, path, query and hash.",
  category: "encoding",
  icon: Link,
  keywords: ["url", "uri", "parse", "query", "querystring", "params", "host", "path"],
  execution: "client",
  status: "stable",
};
