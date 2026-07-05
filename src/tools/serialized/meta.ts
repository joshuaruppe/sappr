import { Boxes } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "serialized",
  title: "Serialized Blob",
  description:
    "Identify a serialized-object blob (Java, JSF ViewState, ASP.NET __VIEWSTATE, PHP, Ruby Marshal, Python pickle) and decode what's cheap — pointing to the right deserialization attack.",
  category: "web",
  icon: Boxes,
  keywords: [
    "serialized",
    "deserialization",
    "viewstate",
    "java serialized",
    "rO0",
    "pickle",
    "php serialize",
    "ruby marshal",
    "jsf",
    "ysoserial",
    "web",
  ],
  execution: "client",
  status: "beta",
};
