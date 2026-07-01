/**
 * Get bytes out of a pasted ticket (Base64 .kirbi is the norm; hex also works)
 * and hand them to the KRB-CRED decoder in `@/lib/kerberos`. Pure — no DOM.
 */
import { parseKirbi, type KerberosCred } from "@/lib/kerberos";

export interface TicketInputResult {
  cred: KerberosCred | null;
  format: "base64" | "hex" | null;
  error: string;
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

/**
 * Parse pasted text as a Kerberos KRB-CRED / .kirbi. Tries Base64 first (the
 * usual form), then hex, and keeps whichever actually decodes to a KRB-CRED.
 */
export function parseTicketInput(input: string): TicketInputResult {
  const trimmed = input.trim();
  if (trimmed === "") return { cred: null, format: null, error: "" };

  const b64 = base64ToBytes(trimmed);
  if (b64) {
    const cred = parseKirbi(b64);
    if (cred) return { cred, format: "base64", error: "" };
  }
  const hex = hexToBytes(trimmed);
  if (hex) {
    const cred = parseKirbi(hex);
    if (cred) return { cred, format: "hex", error: "" };
  }
  return {
    cred: null,
    format: null,
    error:
      "Not a recognized Kerberos ticket. Paste a KRB-CRED / .kirbi (e.g. Rubeus output) as Base64 or hex.",
  };
}
