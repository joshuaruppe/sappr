/**
 * Decode ASN.1 DER/BER (X.509 certs, keys, PKCS, CMS, SNMP…) into a readable
 * tree, using the `asn1js` parser. Accepts hex, Base64 or PEM. Names the common
 * object identifiers. The `walk` step is a thin, pure transform over the parsed
 * blocks so the rest is easy to reason about.
 */
import { fromBER } from "asn1js";

export interface AsnNode {
  type: string;
  constructed: boolean;
  length: number;
  value?: string;
  children?: AsnNode[];
}

export interface AsnResult {
  tree?: AsnNode;
  error: string;
}

const UNIVERSAL: Record<number, string> = {
  1: "BOOLEAN",
  2: "INTEGER",
  3: "BIT STRING",
  4: "OCTET STRING",
  5: "NULL",
  6: "OBJECT IDENTIFIER",
  9: "REAL",
  10: "ENUMERATED",
  12: "UTF8String",
  16: "SEQUENCE",
  17: "SET",
  18: "NumericString",
  19: "PrintableString",
  20: "TeletexString",
  22: "IA5String",
  23: "UTCTime",
  24: "GeneralizedTime",
  26: "VisibleString",
  27: "GeneralString",
  30: "BMPString",
};

const OID_NAMES: Record<string, string> = {
  "2.5.4.3": "commonName",
  "2.5.4.6": "countryName",
  "2.5.4.7": "localityName",
  "2.5.4.8": "stateOrProvinceName",
  "2.5.4.10": "organizationName",
  "2.5.4.11": "organizationalUnitName",
  "2.5.29.14": "subjectKeyIdentifier",
  "2.5.29.15": "keyUsage",
  "2.5.29.17": "subjectAltName",
  "2.5.29.19": "basicConstraints",
  "2.5.29.35": "authorityKeyIdentifier",
  "2.5.29.37": "extKeyUsage",
  "1.2.840.113549.1.1.1": "rsaEncryption",
  "1.2.840.113549.1.1.11": "sha256WithRSAEncryption",
  "1.2.840.113549.1.1.5": "sha1WithRSAEncryption",
  "1.2.840.10045.2.1": "ecPublicKey",
  "1.2.840.10045.4.3.2": "ecdsaWithSHA256",
  "1.3.6.1.5.5.7.3.1": "serverAuth",
  "1.3.6.1.5.5.7.3.2": "clientAuth",
  "1.2.840.113549.1.9.1": "emailAddress",
};

interface AsnBlock {
  idBlock: { tagClass: number; tagNumber: number; isConstructed: boolean };
  lenBlock: { length: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valueBlock: any;
}

function typeName(b: AsnBlock): string {
  const { tagClass, tagNumber } = b.idBlock;
  if (tagClass === 1) return UNIVERSAL[tagNumber] ?? `[UNIVERSAL ${tagNumber}]`;
  if (tagClass === 2) return `[APPLICATION ${tagNumber}]`;
  if (tagClass === 3) return `[${tagNumber}]`; // context-specific
  return `[PRIVATE ${tagNumber}]`;
}

function hexView(vb: AsnBlock["valueBlock"]): Uint8Array | null {
  if (vb.valueHexView instanceof Uint8Array) return vb.valueHexView;
  if (vb.valueHex) return new Uint8Array(vb.valueHex);
  return null;
}

function hexPreview(bytes: Uint8Array, max = 32): string {
  const head = Array.from(bytes.subarray(0, max), (x) => x.toString(16).padStart(2, "0")).join(" ");
  return bytes.length > max ? `${head} … (${bytes.length} bytes)` : head;
}

function valueOf(b: AsnBlock): string | undefined {
  if (b.idBlock.tagClass !== 1) {
    const hv = hexView(b.valueBlock);
    return hv && hv.length ? hexPreview(hv) : undefined;
  }
  try {
    switch (b.idBlock.tagNumber) {
      case 1:
        return String(b.valueBlock.value);
      case 2:
      case 10: {
        const hv = hexView(b.valueBlock);
        if (hv && hv.length > 6) return "0x" + Array.from(hv, (x) => x.toString(16).padStart(2, "0")).join("");
        return b.valueBlock.valueDec !== undefined ? String(b.valueBlock.valueDec) : b.valueBlock.toString();
      }
      case 6:
      case 13: {
        const oid = String(b.valueBlock.toString());
        return OID_NAMES[oid] ? `${oid} (${OID_NAMES[oid]})` : oid;
      }
      case 3:
      case 4: {
        const hv = hexView(b.valueBlock);
        return hv ? hexPreview(hv) : undefined;
      }
      case 5:
        return undefined;
      case 12:
      case 18:
      case 19:
      case 20:
      case 22:
      case 26:
      case 27:
      case 30:
      case 23:
      case 24:
        return b.valueBlock.value != null ? String(b.valueBlock.value) : undefined;
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

function walk(b: AsnBlock): AsnNode {
  const constructed = b.idBlock.isConstructed;
  const node: AsnNode = { type: typeName(b), constructed, length: b.lenBlock.length };
  const kids = b.valueBlock?.value;
  if (constructed && Array.isArray(kids)) {
    node.children = kids.map((c: AsnBlock) => walk(c));
  } else {
    node.value = valueOf(b);
  }
  return node;
}

function toBytes(input: string): Uint8Array {
  const t = input.trim();
  if (/-----BEGIN/.test(t)) {
    const b64 = t.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const hex = t.replace(/0x/gi, "").replace(/[\s:,-]/g, "");
  if (hex.length >= 4 && hex.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hex)) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  const b64 = t.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function decodeAsn1(input: string): AsnResult {
  if (input.trim() === "") return { error: "" };
  let bytes: Uint8Array;
  try {
    bytes = toBytes(input);
  } catch {
    return { error: "Could not read the input as hex, Base64 or PEM." };
  }
  if (bytes.length === 0) return { error: "" };

  const parsed = fromBER(bytes);
  if (parsed.offset === -1) {
    return { error: "Not valid ASN.1 DER/BER — check the bytes." };
  }
  return { tree: walk(parsed.result as unknown as AsnBlock), error: "" };
}
