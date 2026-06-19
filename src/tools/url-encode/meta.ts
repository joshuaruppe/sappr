import { Link } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "url-encode",
  title: "URL Encode",
  description:
    "Percent-encode and decode URLs, with component vs full-URI scope and form (+) spaces.",
  category: "encoding",
  icon: Link,
  keywords: [
    "url",
    "uri",
    "percent",
    "encode",
    "decode",
    "encodeURIComponent",
    "decodeURIComponent",
    "querystring",
    "escape",
  ],
  execution: "client",
  status: "stable",
};
