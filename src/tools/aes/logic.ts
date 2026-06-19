/**
 * Symmetric AES encrypt/decrypt over the Web Crypto API (crypto.subtle).
 * Pure async functions — no DOM/React, safe for tests & workers.
 *
 * ## Output container layout
 *
 * Everything is packed into a single byte buffer and then base64-encoded:
 *
 *   [ magic(3) | version(1) | flags(1) | salt(16, only if passphrase) | iv(N) | ciphertext ]
 *
 *   - magic   : 0x41 0x45 0x53  ("AES")        — sanity check on decrypt
 *   - version : 0x01                            — container revision
 *   - flags   : bit0 = cipher (0 = GCM, 1 = CBC)
 *               bit1 = key kind (0 = raw key, 1 = passphrase/PBKDF2)
 *   - salt    : 16 random bytes, present ONLY when bit1 is set (passphrase)
 *   - iv      : 12 bytes for GCM, 16 bytes for CBC
 *   - ciphertext : AES output (GCM tag is appended by WebCrypto)
 *
 * The flags byte makes the container self-describing: decrypt reads the cipher
 * and whether a PBKDF2 salt is present straight from the header. The caller
 * still supplies the matching key material and (for passphrases) iteration
 * count via `opts`.
 */

export type AesCipher = "AES-GCM" | "AES-CBC";
export type AesKeyType = "passphrase" | "hex" | "base64";

export interface AesOptions {
  /** Block cipher mode. */
  cipher: AesCipher;
  /** How `key` is interpreted. */
  keyType: AesKeyType;
  /** Passphrase, hex string, or base64 string depending on `keyType`. */
  key: string;
}

const MAGIC = [0x41, 0x45, 0x53] as const; // "AES"
const VERSION = 0x01;
const FLAG_CBC = 0b0000_0001;
const FLAG_PASSPHRASE = 0b0000_0010;
const SALT_LEN = 16;
const PBKDF2_ITERATIONS = 200_000;

function ivLength(cipher: AesCipher): number {
  return cipher === "AES-GCM" ? 12 : 16;
}

// --- base64 over raw bytes (standard alphabet) -----------------------------

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToBytes(input: string): Uint8Array {
  const s = input.replace(/\s+/g, "");
  if (s === "") return new Uint8Array(0);
  let bin: string;
  try {
    bin = atob(s);
  } catch {
    throw new Error("Ciphertext is not valid Base64.");
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function hexToBytes(hex: string): Uint8Array {
  const s = hex.replace(/\s+/g, "").replace(/^0x/i, "");
  if (s.length === 0) throw new Error("Hex key is empty.");
  if (s.length % 2 !== 0) {
    throw new Error("Hex key must have an even number of digits.");
  }
  if (!/^[0-9a-fA-F]+$/.test(s)) {
    throw new Error("Hex key contains non-hexadecimal characters.");
  }
  const bytes = new Uint8Array(s.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// --- key derivation / import -----------------------------------------------

function assertRawKeyLength(bytes: Uint8Array): void {
  if (bytes.length !== 16 && bytes.length !== 24 && bytes.length !== 32) {
    throw new Error(
      `Raw key must be 16, 24, or 32 bytes (got ${bytes.length}).`,
    );
  }
}

async function deriveFromPassphrase(
  passphrase: string,
  cipher: AesCipher,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: cipher, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function importRawKey(
  raw: Uint8Array,
  cipher: AesCipher,
): Promise<CryptoKey> {
  assertRawKeyLength(raw);
  return crypto.subtle.importKey("raw", raw as BufferSource, { name: cipher }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function rawKeyBytes(opts: AesOptions): Uint8Array {
  return opts.keyType === "hex"
    ? hexToBytes(opts.key)
    : base64ToBytes(opts.key);
}

// --- public API ------------------------------------------------------------

export async function encryptAes(
  plaintext: string,
  opts: AesOptions,
): Promise<string> {
  if (plaintext === "") return "";
  if (opts.key.trim() === "") throw new Error("A key is required.");

  const usePassphrase = opts.keyType === "passphrase";
  const iv = crypto.getRandomValues(new Uint8Array(ivLength(opts.cipher)));

  let key: CryptoKey;
  let salt: Uint8Array | null = null;
  if (usePassphrase) {
    salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    key = await deriveFromPassphrase(opts.key, opts.cipher, salt);
  } else {
    key = await importRawKey(rawKeyBytes(opts), opts.cipher);
  }

  let cipherBuf: ArrayBuffer;
  try {
    cipherBuf = await crypto.subtle.encrypt(
      { name: opts.cipher, iv: iv as BufferSource },
      key,
      new TextEncoder().encode(plaintext),
    );
  } catch {
    throw new Error("Encryption failed. Check the key and cipher settings.");
  }
  const ct = new Uint8Array(cipherBuf);

  let flags = 0;
  if (opts.cipher === "AES-CBC") flags |= FLAG_CBC;
  if (usePassphrase) flags |= FLAG_PASSPHRASE;

  const head = 3 + 1 + 1; // magic + version + flags
  const saltLen = salt ? SALT_LEN : 0;
  const out = new Uint8Array(head + saltLen + iv.length + ct.length);
  let o = 0;
  out.set(MAGIC, o);
  o += 3;
  out[o++] = VERSION;
  out[o++] = flags;
  if (salt) {
    out.set(salt, o);
    o += SALT_LEN;
  }
  out.set(iv, o);
  o += iv.length;
  out.set(ct, o);

  return bytesToBase64(out);
}

export async function decryptAes(
  ciphertextB64: string,
  opts: AesOptions,
): Promise<string> {
  if (ciphertextB64.trim() === "") return "";
  if (opts.key.trim() === "") throw new Error("A key is required.");

  const buf = base64ToBytes(ciphertextB64);
  if (buf.length < 5) throw new Error("Ciphertext is too short to parse.");

  let o = 0;
  if (buf[0] !== MAGIC[0] || buf[1] !== MAGIC[1] || buf[2] !== MAGIC[2]) {
    throw new Error("Unrecognized ciphertext (bad header).");
  }
  o += 3;
  const version = buf[o++];
  if (version !== VERSION) {
    throw new Error(`Unsupported container version (${version}).`);
  }
  const flags = buf[o++];
  const cipher: AesCipher = flags & FLAG_CBC ? "AES-CBC" : "AES-GCM";
  const hasSalt = (flags & FLAG_PASSPHRASE) !== 0;

  let salt: Uint8Array | null = null;
  if (hasSalt) {
    if (buf.length < o + SALT_LEN) {
      throw new Error("Ciphertext is truncated (missing salt).");
    }
    salt = buf.subarray(o, o + SALT_LEN);
    o += SALT_LEN;
  }

  const ivLen = ivLength(cipher);
  if (buf.length < o + ivLen) {
    throw new Error("Ciphertext is truncated (missing IV).");
  }
  const iv = buf.subarray(o, o + ivLen);
  o += ivLen;
  const ct = buf.subarray(o);

  let key: CryptoKey;
  if (hasSalt) {
    if (opts.keyType !== "passphrase") {
      throw new Error(
        "This ciphertext was encrypted with a passphrase; select Passphrase.",
      );
    }
    key = await deriveFromPassphrase(opts.key, cipher, salt as Uint8Array);
  } else {
    if (opts.keyType === "passphrase") {
      throw new Error(
        "This ciphertext was encrypted with a raw key; select Hex or Base64.",
      );
    }
    key = await importRawKey(rawKeyBytes(opts), cipher);
  }

  let plainBuf: ArrayBuffer;
  try {
    plainBuf = await crypto.subtle.decrypt(
      { name: cipher, iv: iv as BufferSource },
      key,
      ct as BufferSource,
    );
  } catch {
    throw new Error("Decryption failed — wrong key or corrupted ciphertext.");
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(plainBuf);
}
