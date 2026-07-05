import { SquareTerminal } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "powershell-encoded",
  title: "PowerShell EncodedCommand",
  description:
    "Encode a script into — or decode — a PowerShell -EncodedCommand (Base64 ↔ UTF-16LE). Decoding auto-unwraps the common inner Base64 + DeflateStream/GzipStream obfuscation used by malware.",
  category: "windows",
  icon: SquareTerminal,
  keywords: [
    "powershell",
    "encodedcommand",
    "encode",
    "-enc",
    "-e",
    "base64",
    "utf-16le",
    "frombase64string",
    "deflate",
    "gzip",
    "deobfuscate",
    "malware",
    "fileless",
    "windows",
  ],
  execution: "client",
  status: "beta",
};
