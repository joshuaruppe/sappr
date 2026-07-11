import { Shield } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "checksec",
  title: "ELF checksec",
  description:
    "Inspect an ELF binary's exploit-mitigation posture in the browser - RELRO, stack canary, NX, PIE, Fortify, RPATH/RUNPATH and whether it's stripped - with findings on what's missing.",
  category: "reversing",
  icon: Shield,
  keywords: [
    "checksec",
    "elf",
    "hardening",
    "mitigations",
    "relro",
    "nx",
    "pie",
    "canary",
    "fortify",
    "rpath",
    "runpath",
    "pwn",
    "binary",
  ],
  execution: "client",
  status: "beta",
};
