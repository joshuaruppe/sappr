import { RotateCw } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "rot",
  title: "ROT / Caesar",
  description: "Classic letter rotation: ROT13, ROT47 and custom Caesar shifts.",
  category: "crypto",
  icon: RotateCw,
  keywords: ["rot13", "rot47", "caesar", "cipher", "shift", "rotate", "rotation"],
  execution: "client",
  status: "stable",
};
