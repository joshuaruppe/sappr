/**
 * Parse an SSH authorized_keys file: SHA-256 fingerprint each key, surface the
 * key options (command=/from= restrictions, forwarding), and flag weak algorithms
 * and unrestricted keys - a top persistence vector (ATT&CK T1098.004).
 * Uses WebCrypto; client-side only.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface SshKey {
  type: string;
  /** Key size in bits for RSA/DSA; undefined for fixed-size types (ed25519). */
  bits?: number;
  fingerprint: string;
  comment: string;
  options: string[];
  /** True if a command= / from= / restrict option limits the key. */
  restricted: boolean;
  raw: string;
}

export interface AuthKeysResult {
  keys: SshKey[];
  findings: Finding[];
  error: string;
}

const KEY_TYPE_RE =
  /(ssh-(?:rsa|dss|ed25519)|ecdsa-sha2-nistp\d+|sk-[\w@.-]+)\s+([A-Za-z0-9+/=]{20,})/;

const SEV_RANK: Record<Severity, number> = { high: 0, medium: 1, info: 2 };

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64.replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Split SSH options on commas, respecting quoted values. */
function splitOptions(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (const ch of s) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === "," && !inQuote) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Read the length-prefixed fields of an SSH public-key blob. */
function readFields(blob: Uint8Array): Uint8Array[] {
  const fields: Uint8Array[] = [];
  const dv = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  let off = 0;
  while (off + 4 <= blob.length) {
    const len = dv.getUint32(off, false);
    off += 4;
    if (len > blob.length - off) break;
    fields.push(blob.subarray(off, off + len));
    off += len;
  }
  return fields;
}

function mpintBits(mpint: Uint8Array): number {
  let i = 0;
  while (i < mpint.length && mpint[i] === 0) i++;
  if (i >= mpint.length) return 0;
  return (mpint.length - i - 1) * 8 + (32 - Math.clz32(mpint[i]));
}

function keyBits(blob: Uint8Array, type: string): number | undefined {
  const f = readFields(blob);
  if (type === "ssh-rsa" && f.length >= 3) return mpintBits(f[2]); // [type, e, n]
  if (type === "ssh-dss" && f.length >= 2) return mpintBits(f[1]); // [type, p, q, g, y]
  return undefined;
}

async function fingerprint(blob: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", blob));
  let bin = "";
  for (const b of digest) bin += String.fromCharCode(b);
  return "SHA256:" + btoa(bin).replace(/=+$/, "");
}

export async function analyzeAuthorizedKeys(input: string): Promise<AuthKeysResult> {
  const empty: AuthKeysResult = { keys: [], findings: [], error: "" };
  const text = input.trim();
  if (text === "") return empty;

  const keys: SshKey[] = [];
  const findings: Finding[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const m = line.match(KEY_TYPE_RE);
    if (!m) continue;

    const type = m[1];
    const blobB64 = m[2];
    const optionsStr = line.slice(0, m.index).trim();
    const comment = line.slice((m.index ?? 0) + m[0].length).trim();
    const options = optionsStr ? splitOptions(optionsStr) : [];
    const restricted = /(^|,)\s*(command|from|restrict)\b/i.test(optionsStr);

    let bits: number | undefined;
    let fp = "SHA256:(unparsable)";
    try {
      const blob = base64ToBytes(blobB64);
      bits = keyBits(blob, type);
      fp = await fingerprint(blob);
    } catch {
      // keep the key listed even if the blob is malformed
    }

    keys.push({ type, bits, fingerprint: fp, comment, options, restricted, raw: line });

    const label = comment || fp;
    if (type === "ssh-dss") {
      findings.push({
        severity: "high",
        message: `DSA key (${label}) - deprecated and weak; disabled by default in modern OpenSSH.`,
      });
    }
    if (type === "ssh-rsa" && bits !== undefined && bits < 2048) {
      findings.push({
        severity: "high",
        message: `${bits}-bit RSA key (${label}) - too small; 3072+ or ed25519 recommended.`,
      });
    }
    if (!restricted) {
      findings.push({
        severity: "medium",
        message: `Unrestricted key (${label}) - no from=/command= limit, so it grants an interactive shell from any host (persistence vector).`,
      });
    }
  }

  if (keys.length === 0) {
    return {
      ...empty,
      error: "No SSH keys found. Paste an authorized_keys file (e.g. `ssh-ed25519 AAAA… user@host`).",
    };
  }

  findings.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  return { keys, findings, error: "" };
}
