import { Fingerprint } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "uuid",
  title: "UUID / ULID",
  description: "Generate UUID v4, UUID v7, ULID and NIL identifiers in bulk.",
  category: "generate",
  icon: Fingerprint,
  keywords: ["uuid", "guid", "ulid", "v4", "v7", "nil", "identifier", "random"],
  execution: "client",
  status: "stable",
};
