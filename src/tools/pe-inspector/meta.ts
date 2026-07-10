import { FileCode2 } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "pe-inspector",
  title: "PE Inspector",
  description:
    "Inspect a Windows PE (EXE/DLL/SYS): headers, machine and subsystem, ASLR/DEP/CFG mitigations, data directories (signed? .NET?), the section table with entropy (spot packing), and the imported DLLs/APIs.",
  category: "reversing",
  icon: FileCode2,
  keywords: [
    "pe",
    "portable executable",
    "exe",
    "dll",
    "malware",
    "reversing",
    "imports",
    "sections",
    "entropy",
    "packed",
    "aslr",
    "dep",
    "authenticode",
    "dllcharacteristics",
  ],
  execution: "client",
  status: "beta",
};
