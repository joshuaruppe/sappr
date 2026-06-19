/**
 * Thin wrappers around the `qrcode` library.
 * Pure async functions — no DOM/React; safe for tests and workers.
 */
import QRCode from "qrcode";

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface QrOptions {
  /** Error correction level (default "M"). */
  errorCorrectionLevel?: ErrorCorrectionLevel;
  /** Quiet-zone margin in modules (default 4). */
  margin?: number;
  /** Output width in pixels for the PNG data URL (default 256). */
  width?: number;
  /** Foreground (dark) color, hex (default "#000000"). */
  dark?: string;
  /** Background (light) color, hex (default "#ffffff"). */
  light?: string;
}

/** Render `text` to a PNG data URL (`data:image/png;base64,...`). */
export function makeQrDataUrl(
  text: string,
  opts: QrOptions = {},
): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: opts.errorCorrectionLevel ?? "M",
    margin: opts.margin ?? 4,
    width: opts.width ?? 256,
    color: {
      dark: opts.dark ?? "#000000",
      light: opts.light ?? "#ffffff",
    },
  });
}

/** Render `text` to an SVG string starting with `<svg`. */
export function makeQrSvg(text: string, opts: QrOptions = {}): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: opts.errorCorrectionLevel ?? "M",
    margin: opts.margin ?? 4,
    color: {
      dark: opts.dark ?? "#000000",
      light: opts.light ?? "#ffffff",
    },
  });
}
