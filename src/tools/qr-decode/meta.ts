import { ScanLine } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "qr-decode",
  title: "QR Decode",
  description: "Decode a QR code from an uploaded image.",
  category: "forensics",
  icon: ScanLine,
  keywords: ["qr", "qrcode", "decode", "scan", "read", "image"],
  execution: "client",
  status: "stable",
};
