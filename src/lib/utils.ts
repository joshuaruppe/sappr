import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts predictably. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Copy text to the clipboard, resolving to whether it succeeded. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts / older browsers.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Insert a filename-safe local timestamp before the extension, so downloading
 * several files in a row doesn't collide or make you rename each one:
 * `cidrs.txt` -> `cidrs_20260711-143005.txt`. Extensionless names get it appended.
 */
export function timestampedName(filename: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const dot = filename.lastIndexOf(".");
  return dot > 0
    ? `${filename.slice(0, dot)}_${stamp}${filename.slice(dot)}`
    : `${filename}_${stamp}`;
}

/** Trigger a client-side download of the given content. The saved filename is
 * timestamped (see {@link timestampedName}) so repeated downloads don't clash. */
export function downloadBlob(
  content: BlobPart,
  filename: string,
  type = "application/octet-stream",
) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = timestampedName(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Human-readable byte size. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(
    Math.max(Math.floor(Math.log(bytes) / Math.log(k)), 0),
    units.length - 1,
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2))} ${units[i]}`;
}
