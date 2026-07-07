import { Aperture } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "exif-viewer",
  title: "EXIF / Metadata Viewer",
  description:
    "Read EXIF, GPS, XMP and IPTC metadata out of an image in the browser — surfacing embedded GPS location, camera serial, device and editing software as privacy/OSINT findings.",
  category: "forensics",
  icon: Aperture,
  keywords: [
    "exif",
    "metadata",
    "gps",
    "geolocation",
    "image",
    "photo",
    "iptc",
    "xmp",
    "osint",
    "camera",
    "privacy",
  ],
  execution: "client",
  status: "beta",
};
