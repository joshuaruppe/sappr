import { QrCode } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "qr-generate",
  title: "QR Generate",
  description: "Generate a QR code from any text or URL, with PNG and SVG export.",
  category: "generate",
  icon: QrCode,
  keywords: ["qr", "qrcode", "barcode", "url", "generate", "png", "svg"],
  execution: "client",
  status: "stable",
};
