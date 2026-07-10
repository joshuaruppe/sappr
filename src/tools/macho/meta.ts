import { FileBox } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "macho",
  title: "Mach-O Parser",
  description:
    "Parse a macOS / iOS Mach-O binary (32/64-bit, both byte orders, fat/universal): header, CPU + file type, MH_ flags (PIE), segments/sections, linked dylibs, UUID, code-signature and encryption state.",
  category: "reversing",
  icon: FileBox,
  keywords: [
    "mach-o",
    "macho",
    "macos",
    "ios",
    "dylib",
    "load command",
    "universal",
    "fat binary",
    "otool",
    "apple",
    "segment",
  ],
  execution: "client",
  status: "beta",
};
