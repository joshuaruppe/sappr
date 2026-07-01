/**
 * Turn a pasted security descriptor (Base64 or hex bytes) into a parsed
 * structure. The heavy lifting lives in `@/lib/security-descriptor`; this just
 * gets bytes out of whatever text the user pasted. Pure — no DOM.
 */
import {
  parseSecurityDescriptor,
  type SecurityDescriptor,
} from "@/lib/security-descriptor";

export interface SdInputResult {
  sd: SecurityDescriptor | null;
  /** Which input encoding was recognized, or null. */
  format: "base64" | "hex" | null;
  /** Non-empty when the input is non-blank but isn't a valid descriptor. */
  error: string;
}

function hexToBytes(input: string): Uint8Array | null {
  const clean = input.replace(/0x/gi, "").replace(/[\s:,_-]/g, "");
  if (clean.length < 2 || clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) {
    return null;
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function base64ToBytes(input: string): Uint8Array | null {
  let s = input.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (s === "" || /[^A-Za-z0-9+/=]/.test(s)) return null;
  s = s.replace(/=+$/g, "");
  const mod = s.length % 4;
  if (mod === 1) return null;
  if (mod === 2) s += "==";
  else if (mod === 3) s += "=";
  try {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Parse pasted text as a security descriptor. Tries hex first (stricter), then
 * Base64, and keeps whichever actually yields a valid self-relative descriptor.
 */
export function parseSdInput(input: string): SdInputResult {
  const trimmed = input.trim();
  if (trimmed === "") return { sd: null, format: null, error: "" };

  const hex = hexToBytes(trimmed);
  if (hex) {
    const sd = parseSecurityDescriptor(hex);
    if (sd) return { sd, format: "hex", error: "" };
  }
  const b64 = base64ToBytes(trimmed);
  if (b64) {
    const sd = parseSecurityDescriptor(b64);
    if (sd) return { sd, format: "base64", error: "" };
  }
  return {
    sd: null,
    format: null,
    error:
      "Not a recognized security descriptor. Paste a self-relative SECURITY_DESCRIPTOR as Base64 or hex.",
  };
}
