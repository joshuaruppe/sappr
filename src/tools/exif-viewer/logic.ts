/**
 * Read metadata (EXIF/TIFF, GPS, XMP, IPTC, ICC) out of an image entirely in the
 * browser via `exifr`. The heavy parse lives in `parseImageMetadata`; the pure,
 * testable `shapeMetadata` groups the raw tag bag, extracts GPS coordinates and
 * raises privacy/attribution findings (location, camera serial, device, editor).
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface MetaField {
  key: string;
  value: string;
}

export interface MetadataResult {
  groups: { title: string; fields: MetaField[] }[];
  gps?: { lat: number; lon: number; mapsUrl: string };
  findings: Finding[];
  tagCount: number;
  error: string;
}

const GROUPS: { title: string; keys: string[] }[] = [
  { title: "Device", keys: ["Make", "Model", "LensMake", "LensModel", "HostComputer"] },
  {
    title: "Capture settings",
    keys: [
      "FNumber",
      "ExposureTime",
      "ISO",
      "ISOSpeedRatings",
      "FocalLength",
      "FocalLengthIn35mmFormat",
      "Flash",
      "WhiteBalance",
      "ExposureProgram",
      "MeteringMode",
    ],
  },
  {
    title: "Image",
    keys: [
      "ImageWidth",
      "ImageHeight",
      "ExifImageWidth",
      "ExifImageHeight",
      "Orientation",
      "XResolution",
      "YResolution",
      "ColorSpace",
    ],
  },
  {
    title: "Timestamps",
    keys: ["DateTimeOriginal", "CreateDate", "ModifyDate", "DateTimeDigitized", "GPSDateStamp"],
  },
  {
    title: "Software / author",
    keys: [
      "Software",
      "Artist",
      "Copyright",
      "OwnerName",
      "ImageDescription",
      "UserComment",
      "SerialNumber",
      "BodySerialNumber",
      "LensSerialNumber",
    ],
  },
];

const GROUPED_KEYS = new Set(GROUPS.flatMap((g) => g.keys));
const GPS_KEYS = new Set(["latitude", "longitude"]);

function formatValue(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(formatValue).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6)));
  return String(v);
}

/** Group a raw exifr tag object, extract GPS, and raise findings. Pure. */
export function shapeMetadata(raw: Record<string, unknown>): MetadataResult {
  const groups: { title: string; fields: MetaField[] }[] = [];

  for (const g of GROUPS) {
    const fields: MetaField[] = [];
    for (const key of g.keys) {
      if (raw[key] != null && raw[key] !== "") fields.push({ key, value: formatValue(raw[key]) });
    }
    if (fields.length) groups.push({ title: g.title, fields });
  }

  // Everything not already grouped and not a raw GPS coordinate.
  const other: MetaField[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (GROUPED_KEYS.has(key) || GPS_KEYS.has(key)) continue;
    if (value == null || value === "") continue;
    other.push({ key, value: formatValue(value) });
  }
  if (other.length) groups.push({ title: "Other metadata", fields: other });

  const lat = typeof raw.latitude === "number" ? raw.latitude : undefined;
  const lon = typeof raw.longitude === "number" ? raw.longitude : undefined;
  const gps =
    lat !== undefined && lon !== undefined
      ? {
          lat,
          lon,
          mapsUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`,
        }
      : undefined;

  const findings: Finding[] = [];
  if (gps) {
    findings.push({
      severity: "medium",
      message: `Embedded GPS location: ${gps.lat}, ${gps.lon} - a privacy / OSINT leak that pinpoints where the photo was taken.`,
    });
  }
  const serial = raw.SerialNumber ?? raw.BodySerialNumber;
  if (serial) {
    findings.push({
      severity: "medium",
      message: `Camera serial number embedded (${formatValue(serial)}) - ties every photo from this device together.`,
    });
  }
  if (raw.Make || raw.Model) {
    findings.push({
      severity: "info",
      message: `Capture device: ${[raw.Make, raw.Model].filter(Boolean).map(formatValue).join(" ")}.`,
    });
  }
  if (raw.Software) {
    findings.push({ severity: "info", message: `Processed/edited with: ${formatValue(raw.Software)}.` });
  }

  return { groups, gps, findings, tagCount: Object.keys(raw).length, error: "" };
}

/** Parse an image's metadata client-side (dynamic-imports exifr so it code-splits). */
export async function parseImageMetadata(input: ArrayBuffer): Promise<MetadataResult> {
  const exifr = (await import("exifr")).default;
  let raw: Record<string, unknown> | undefined;
  try {
    raw = (await exifr.parse(input, {
      tiff: true,
      exif: true,
      gps: true,
      xmp: true,
      iptc: true,
      icc: true,
      jfif: true,
      mergeOutput: true,
      translateKeys: true,
      translateValues: true,
      reviveValues: true,
    })) as Record<string, unknown> | undefined;
  } catch (e) {
    return { groups: [], findings: [], tagCount: 0, error: `Could not read metadata: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!raw || Object.keys(raw).length === 0) {
    return { groups: [], findings: [], tagCount: 0, error: "No embedded metadata found (it may have been stripped)." };
  }
  return shapeMetadata(raw);
}
