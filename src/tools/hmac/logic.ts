/**
 * HMAC over a message with a secret key, using hash-wasm.
 * Pure functions — no DOM/React. The key may be provided as a string
 * (interpreted as UTF-8) or as raw bytes.
 */
import {
  createHMAC,
  createMD5,
  createSHA1,
  createSHA256,
  createSHA512,
} from "hash-wasm";

export type HmacAlgo = "md5" | "sha1" | "sha256" | "sha512";
export type KeyEncoding = "utf-8" | "hex" | "base64";

export const HMAC_ALGOS: HmacAlgo[] = ["md5", "sha1", "sha256", "sha512"];

function makeHash(algo: HmacAlgo) {
  switch (algo) {
    case "md5":
      return createMD5();
    case "sha1":
      return createSHA1();
    case "sha256":
      return createSHA256();
    case "sha512":
      return createSHA512();
    default: {
      const never: never = algo;
      throw new Error(`Unsupported algorithm: ${String(never)}`);
    }
  }
}

/**
 * Decode a key string into bytes according to the chosen encoding.
 * UTF-8 encodes the text directly; hex/base64 parse a binary key.
 */
export function decodeKey(key: string, encoding: KeyEncoding): Uint8Array {
  switch (encoding) {
    case "utf-8":
      return new TextEncoder().encode(key);
    case "hex": {
      const clean = key.replace(/\s+/g, "");
      if (clean === "") return new Uint8Array(0);
      if (!/^[0-9a-fA-F]+$/.test(clean)) {
        throw new Error("Key contains characters that are not valid hex.");
      }
      if (clean.length % 2 !== 0) {
        throw new Error("Hex key must have an even number of digits.");
      }
      const bytes = new Uint8Array(clean.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
      }
      return bytes;
    }
    case "base64": {
      const clean = key.replace(/\s+/g, "");
      if (clean === "") return new Uint8Array(0);
      let s = clean.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/g, "");
      if (!/^[A-Za-z0-9+/]*$/.test(s)) {
        throw new Error("Key contains characters that are not valid Base64.");
      }
      const mod = s.length % 4;
      if (mod === 1) {
        throw new Error("Invalid Base64 key (truncated input).");
      }
      if (mod === 2) s += "==";
      else if (mod === 3) s += "=";
      let bin: string;
      try {
        bin = atob(s);
      } catch {
        throw new Error("Could not decode Base64 key (malformed input).");
      }
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    default: {
      const never: never = encoding;
      throw new Error(`Unsupported key encoding: ${String(never)}`);
    }
  }
}

/**
 * Compute the HMAC of `message` (UTF-8) under `key` using `algo`.
 * Returns the lowercase hex digest. The key may be a string (UTF-8) or bytes.
 */
export async function computeHmac(
  message: string,
  key: Uint8Array | string,
  algo: HmacAlgo,
): Promise<string> {
  const h = await createHMAC(makeHash(algo), key);
  h.init();
  h.update(message);
  return h.digest("hex");
}
