import { Braces } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "code-beautify",
  title: "Code Beautify",
  description: "Format JSON, YAML, XML, SQL, JS/TS, HTML, CSS, GraphQL and more, in-browser and offline.",
  category: "formatting",
  icon: Braces,
  keywords: [
    "prettier",
    "format",
    "beautify",
    "pretty",
    "indent",
    "json",
    "yaml",
    "xml",
    "sql",
    "javascript",
    "typescript",
    "html",
    "css",
    "scss",
    "less",
    "graphql",
    "markdown",
  ],
  execution: "client",
  status: "stable",
};
