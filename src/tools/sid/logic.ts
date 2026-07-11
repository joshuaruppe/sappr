/**
 * Decode a Windows Security Identifier (SID) between string and binary form,
 * resolve well-known SIDs and RIDs, and break out the identifier authority and
 * sub-authorities. Pure - no DOM. Reuses the well-known-SID table from the
 * Security Descriptor library.
 */
import { wellKnownSidName } from "@/lib/security-descriptor";

export interface SidResult {
  /** Canonical SID string, e.g. "S-1-5-21-…-500". */
  sid: string;
  /** Binary form as spaced hex. */
  binaryHex: string;
  revision: number;
  /** Identifier authority as a decimal string. */
  authority: string;
  authorityName?: string;
  subAuthorities: number[];
  /** Last sub-authority (the RID), when present. */
  rid?: number;
  ridName?: string;
  /** For S-1-5-21 domain SIDs: the SID without its RID. */
  domainSid?: string;
  /** Well-known name for the whole SID, if recognized. */
  name?: string;
  /** Which input form was recognized. */
  format: "string" | "binary";
  error: string;
}

const AUTHORITIES: Record<string, string> = {
  "0": "Null Authority",
  "1": "World Authority",
  "2": "Local Authority",
  "3": "Creator Authority",
  "4": "Non-unique Authority",
  "5": "NT Authority",
  "15": "App Package / AAD Authority",
  "16": "Mandatory Label Authority",
  "18": "Asserted Identity Authority",
};

const RIDS: Record<number, string> = {
  500: "Administrator (built-in)",
  501: "Guest",
  502: "krbtgt (KDC service account)",
  512: "Domain Admins",
  513: "Domain Users",
  514: "Domain Guests",
  515: "Domain Computers",
  516: "Domain Controllers",
  517: "Cert Publishers",
  518: "Schema Admins",
  519: "Enterprise Admins",
  520: "Group Policy Creator Owners",
  521: "Read-only Domain Controllers",
  526: "Key Admins",
  527: "Enterprise Key Admins",
  553: "RAS and IAS Servers",
  544: "Administrators (BUILTIN)",
  545: "Users (BUILTIN)",
  546: "Guests (BUILTIN)",
  548: "Account Operators (BUILTIN)",
  549: "Server Operators (BUILTIN)",
  550: "Print Operators (BUILTIN)",
  551: "Backup Operators (BUILTIN)",
  555: "Remote Desktop Users (BUILTIN)",
  562: "Distributed COM Users (BUILTIN)",
  568: "IIS_IUSRS (BUILTIN)",
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
}

function bytesFromHexOrB64(input: string): Uint8Array | null {
  const hex = input.replace(/0x/gi, "").replace(/[\s:,-]/g, "");
  if (hex.length >= 16 && hex.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hex)) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  const b64 = input.replace(/\s+/g, "");
  if (b64 && /^[A-Za-z0-9+/=]+$/.test(b64)) {
    try {
      const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    } catch {
      return null;
    }
  }
  return null;
}

/** Parse a self-relative binary SID into its string + parts. */
function bytesToSid(bytes: Uint8Array): { sid: string; revision: number; authority: bigint; subs: number[] } | null {
  if (bytes.length < 8) return null;
  const revision = bytes[0];
  const subCount = bytes[1];
  if (revision !== 1 || subCount > 15 || bytes.length < 8 + subCount * 4) return null;
  let authority = 0n;
  for (let i = 0; i < 6; i++) authority = (authority << 8n) | BigInt(bytes[2 + i]);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const subs: number[] = [];
  for (let i = 0; i < subCount; i++) subs.push(dv.getUint32(8 + i * 4, true) >>> 0);
  const sid = `S-${revision}-${authority}` + subs.map((s) => `-${s}`).join("");
  return { sid, revision, authority, subs };
}

/** Encode a SID's parts into its binary form. */
function sidToBytes(revision: number, authority: bigint, subs: number[]): Uint8Array {
  const buf = new Uint8Array(8 + subs.length * 4);
  buf[0] = revision;
  buf[1] = subs.length;
  let a = authority;
  for (let i = 5; i >= 0; i--) {
    buf[2 + i] = Number(a & 0xffn);
    a >>= 8n;
  }
  const dv = new DataView(buf.buffer);
  subs.forEach((s, i) => dv.setUint32(8 + i * 4, s >>> 0, true));
  return buf;
}

function annotate(
  sid: string,
  revision: number,
  authority: bigint,
  subs: number[],
  binaryHex: string,
  format: "string" | "binary",
): SidResult {
  const result: SidResult = {
    sid,
    binaryHex,
    revision,
    authority: authority.toString(),
    authorityName: AUTHORITIES[authority.toString()],
    subAuthorities: subs,
    name: wellKnownSidName(sid),
    format,
    error: "",
  };
  if (subs.length > 0) {
    const rid = subs[subs.length - 1];
    result.rid = rid;
    result.ridName = RIDS[rid] ?? (rid >= 1000 ? "created object (user/group/computer)" : undefined);
  }
  // Domain object SID: S-1-5-21-<a>-<b>-<c>-<RID>.
  if (/^S-1-5-21-\d+-\d+-\d+-\d+$/.test(sid)) {
    result.domainSid = sid.slice(0, sid.lastIndexOf("-"));
  }
  return result;
}

/** Parse a SID from its string form (S-1-5-…) or binary (hex / base64). */
export function parseSid(input: string): SidResult {
  const empty: SidResult = {
    sid: "",
    binaryHex: "",
    revision: 0,
    authority: "",
    subAuthorities: [],
    format: "string",
    error: "",
  };
  const s = input.trim();
  if (s === "") return empty;

  // String form.
  if (/^S-\d+-\d+(-\d+)*$/i.test(s)) {
    const parts = s.toUpperCase().split("-");
    const revision = Number(parts[1]);
    let authority: bigint;
    try {
      authority = BigInt(parts[2]);
    } catch {
      return { ...empty, error: "Invalid identifier authority." };
    }
    const subs = parts.slice(3).map((p) => Number(p));
    if (subs.some((n) => !Number.isInteger(n) || n < 0 || n > 0xffffffff)) {
      return { ...empty, error: "A sub-authority is out of the 32-bit range." };
    }
    const canonical = `S-${revision}-${authority}` + subs.map((n) => `-${n}`).join("");
    const bytes = sidToBytes(revision, authority, subs);
    return annotate(canonical, revision, authority, subs, toHex(bytes), "string");
  }

  // Binary form.
  const bytes = bytesFromHexOrB64(s);
  if (bytes) {
    const parsed = bytesToSid(bytes);
    if (parsed) {
      return annotate(parsed.sid, parsed.revision, parsed.authority, parsed.subs, toHex(bytes), "binary");
    }
  }

  return {
    ...empty,
    error: "Enter a SID string (e.g. S-1-5-21-…-500) or its binary form as hex or base64.",
  };
}
