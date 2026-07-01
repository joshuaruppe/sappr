/**
 * Decode a Kerberos KRB-CRED / `.kirbi` (the format Rubeus and Mimikatz emit)
 * into readable ticket metadata: the service, client, encryption types, ticket
 * flags, validity window, and the session key. Pure functions, no DOM.
 *
 * This DECODES; it does not decrypt. The ticket's own EncTicketPart (the PAC) is
 * sealed with the service/krbtgt key and stays opaque. But a `.kirbi`'s
 * EncKrbCredPart is stored unencrypted (etype 0), so the session key, flags,
 * times and names are all readable without any secret — exactly what
 * `Rubeus describe` shows.
 *
 * Structures per RFC 4120 (KRB-CRED [APPLICATION 22], Ticket [APPLICATION 1],
 * EncKrbCredPart [APPLICATION 29]).
 */

// ---------- minimal DER (ASN.1) reader ----------------------------------------

interface DerNode {
  cls: number; // 0 universal, 1 application, 2 context, 3 private
  constructed: boolean;
  tag: number;
  content: Uint8Array; // primitive value bytes
  children: DerNode[];
}

function readDer(bytes: Uint8Array, offset = 0): { node: DerNode; next: number } {
  let p = offset;
  const first = bytes[p++];
  const cls = (first & 0xc0) >> 6;
  const constructed = (first & 0x20) !== 0;
  let tag = first & 0x1f;
  if (tag === 0x1f) {
    tag = 0;
    let b: number;
    do {
      b = bytes[p++];
      tag = (tag << 7) | (b & 0x7f);
    } while (b & 0x80);
  }
  let len = bytes[p++];
  if (len & 0x80) {
    const n = len & 0x7f;
    len = 0;
    for (let i = 0; i < n; i++) len = (len << 8) | bytes[p++];
  }
  const start = p;
  const end = p + len;
  const content = bytes.subarray(start, end);
  const children: DerNode[] = [];
  if (constructed) {
    let q = start;
    while (q < end) {
      const r = readDer(bytes, q);
      children.push(r.node);
      q = r.next;
    }
  }
  return { node: { cls, constructed, tag, content, children }, next: end };
}

/** The value node wrapped by a context tag `[n]`, or undefined if absent. */
function ctx(node: DerNode, n: number): DerNode | undefined {
  return node.children.find((c) => c.cls === 2 && c.tag === n)?.children[0];
}

function derInt(node: DerNode | undefined): number {
  if (!node) return 0;
  let v = 0;
  for (const b of node.content) v = v * 256 + b;
  return v;
}

function derStr(node: DerNode | undefined): string {
  return node ? new TextDecoder().decode(node.content) : "";
}

// ---------- lookups -----------------------------------------------------------

const ETYPE_NAMES: Record<number, string> = {
  0: "null (unencrypted)",
  1: "des-cbc-crc",
  3: "des-cbc-md5",
  17: "aes128-cts-hmac-sha1-96",
  18: "aes256-cts-hmac-sha1-96",
  23: "rc4-hmac (NTLM)",
  24: "rc4-hmac-exp",
};

const NAME_TYPES: Record<number, string> = {
  0: "NT-UNKNOWN",
  1: "NT-PRINCIPAL",
  2: "NT-SRV-INST",
  3: "NT-SRV-HST",
  4: "NT-SRV-XHST",
  5: "NT-UID",
  10: "NT-ENTERPRISE",
};

// Ticket flag bit positions (RFC 4120 §5.3, plus name-canonicalize at 15).
const TICKET_FLAGS: [number, string][] = [
  [1, "forwardable"],
  [2, "forwarded"],
  [3, "proxiable"],
  [4, "proxy"],
  [5, "may_postdate"],
  [6, "postdated"],
  [7, "invalid"],
  [8, "renewable"],
  [9, "initial"],
  [10, "pre_authent"],
  [11, "hw_authent"],
  [12, "transited_policy_checked"],
  [13, "ok_as_delegate"],
  [15, "name_canonicalize"],
];

// ---------- public types ------------------------------------------------------

export interface KerberosTime {
  /** "YYYY-MM-DD HH:MM:SS UTC" */
  display: string;
  epochMs: number;
}

export interface KerberosPrincipal {
  nameType: number;
  nameTypeName: string;
  /** name-string joined with "/", e.g. "krbtgt/CONTOSO.COM". */
  name: string;
}

export interface KerberosEncData {
  etype: number;
  etypeName: string;
  kvno?: number;
  cipherBytes: number;
}

export interface KerberosTicketRef {
  tktVno: number;
  realm: string;
  sname: KerberosPrincipal;
  encPart: KerberosEncData;
}

export interface KerberosCredInfo {
  keyType: number;
  keyTypeName: string;
  keyBase64: string;
  keyHex: string;
  clientRealm?: string;
  client?: KerberosPrincipal;
  flags: string[];
  authTime?: KerberosTime;
  startTime?: KerberosTime;
  endTime?: KerberosTime;
  renewTill?: KerberosTime;
  serviceRealm?: string;
  service?: KerberosPrincipal;
}

export interface KerberosCred {
  msgType: number;
  tickets: KerberosTicketRef[];
  /** etype of the KRB-CRED enc-part (0 = readable, which is the .kirbi norm). */
  credEtype: number;
  /** Readable when credEtype === 0; empty and credEncrypted=true otherwise. */
  info: KerberosCredInfo[];
  credEncrypted: boolean;
  /** True when the (first) ticket is for a TGT (krbtgt/...). */
  isTgt: boolean;
}

// ---------- decoders ----------------------------------------------------------

function principal(node: DerNode | undefined): KerberosPrincipal | undefined {
  if (!node) return undefined;
  const nameType = derInt(ctx(node, 0));
  const nameStrings = ctx(node, 1);
  const parts = nameStrings ? nameStrings.children.map((c) => derStr(c)) : [];
  return { nameType, nameTypeName: NAME_TYPES[nameType] ?? `type ${nameType}`, name: parts.join("/") };
}

function kerbTime(node: DerNode | undefined): KerberosTime | undefined {
  if (!node) return undefined;
  const s = new TextDecoder().decode(node.content);
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z?$/.exec(s);
  if (!m) return { display: s, epochMs: NaN };
  const [, y, mo, d, h, mi, se] = m;
  return {
    display: `${y}-${mo}-${d} ${h}:${mi}:${se} UTC`,
    epochMs: Date.UTC(+y, +mo - 1, +d, +h, +mi, +se),
  };
}

function encData(node: DerNode | undefined): KerberosEncData {
  const etype = derInt(ctx(node!, 0));
  const kvnoNode = ctx(node!, 1);
  const cipher = ctx(node!, 2);
  return {
    etype,
    etypeName: ETYPE_NAMES[etype] ?? `etype ${etype}`,
    kvno: kvnoNode ? derInt(kvnoNode) : undefined,
    cipherBytes: cipher ? cipher.content.length : 0,
  };
}

function b64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function hex(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

function ticketFlags(node: DerNode | undefined): string[] {
  if (!node || node.content.length < 2) return [];
  const bits = node.content.subarray(1); // first byte = unused-bit count
  const out: string[] = [];
  for (const [pos, name] of TICKET_FLAGS) {
    const byteIdx = pos >> 3;
    const bitIdx = 7 - (pos & 7);
    if (byteIdx < bits.length && ((bits[byteIdx] >> bitIdx) & 1)) out.push(name);
  }
  return out;
}

function credInfo(seq: DerNode): KerberosCredInfo {
  const keyNode = ctx(seq, 0);
  const keyType = derInt(ctx(keyNode!, 0));
  const keyVal = ctx(keyNode!, 1)?.content ?? new Uint8Array(0);
  return {
    keyType,
    keyTypeName: ETYPE_NAMES[keyType] ?? `keytype ${keyType}`,
    keyBase64: b64(keyVal),
    keyHex: hex(keyVal),
    clientRealm: ctx(seq, 1) ? derStr(ctx(seq, 1)) : undefined,
    client: principal(ctx(seq, 2)),
    flags: ticketFlags(ctx(seq, 3)),
    authTime: kerbTime(ctx(seq, 4)),
    startTime: kerbTime(ctx(seq, 5)),
    endTime: kerbTime(ctx(seq, 6)),
    renewTill: kerbTime(ctx(seq, 7)),
    serviceRealm: ctx(seq, 8) ? derStr(ctx(seq, 8)) : undefined,
    service: principal(ctx(seq, 9)),
  };
}

/**
 * Parse KRB-CRED bytes (a decoded `.kirbi`). Returns null if the bytes are not a
 * KRB-CRED, so callers can cheaply test arbitrary input.
 */
export function parseKirbi(bytes: Uint8Array): KerberosCred | null {
  try {
    const root = readDer(bytes).node;
    // KRB-CRED ::= [APPLICATION 22] SEQUENCE
    if (root.cls !== 1 || root.tag !== 22) return null;
    const seq = root.children[0];
    const msgType = derInt(ctx(seq, 1));
    if (msgType !== 22) return null;

    // tickets [2] SEQUENCE OF Ticket
    const ticketsSeq = ctx(seq, 2);
    const tickets: KerberosTicketRef[] = (ticketsSeq?.children ?? []).map((t) => {
      const tseq = t.children[0]; // Ticket [APPLICATION 1] -> SEQUENCE
      return {
        tktVno: derInt(ctx(tseq, 0)),
        realm: derStr(ctx(tseq, 1)),
        sname: principal(ctx(tseq, 2))!,
        encPart: encData(ctx(tseq, 3)),
      };
    });

    // enc-part [3] EncryptedData; when etype 0 the cipher is a plain EncKrbCredPart
    const credEnc = ctx(seq, 3);
    const credEtype = derInt(ctx(credEnc!, 0));
    const credCipher = ctx(credEnc!, 2)?.content ?? new Uint8Array(0);

    let info: KerberosCredInfo[] = [];
    let credEncrypted = credEtype !== 0;
    if (credEtype === 0 && credCipher.length) {
      // EncKrbCredPart ::= [APPLICATION 29] SEQUENCE { ticket-info [0] SEQUENCE OF KrbCredInfo, ... }
      const ekcp = readDer(credCipher).node;
      const ekcpSeq = ekcp.children[0];
      const ticketInfo = ctx(ekcpSeq, 0);
      info = (ticketInfo?.children ?? []).map((c) => credInfo(c));
    }

    const isTgt = /^krbtgt(\/|$)/i.test(tickets[0]?.sname.name ?? "");

    return { msgType, tickets, credEtype, info, credEncrypted, isTgt };
  } catch {
    return null;
  }
}
