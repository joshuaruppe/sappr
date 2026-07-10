import { Code2 } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "disasm",
  title: "Disassembler",
  description:
    "Disassemble raw bytes with Capstone (in-browser WASM): paste hex/Base64, pick x86/x64/ARM/ARM64/Thumb/MIPS and a base address, and read the address / bytes / instruction listing — for shellcode, gadgets or a code snippet.",
  category: "reversing",
  icon: Code2,
  keywords: [
    "disassembler",
    "disasm",
    "capstone",
    "assembly",
    "x86",
    "x64",
    "arm",
    "arm64",
    "thumb",
    "mips",
    "opcode",
    "mnemonic",
    "shellcode",
  ],
  execution: "client",
  status: "beta",
};
