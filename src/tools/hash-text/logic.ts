/**
 * Compute a fixed set of text digests at once.
 * Pure async functions — no DOM/React; all hashing runs via hash-wasm,
 * which accepts a string (UTF-8) or a Uint8Array and returns lowercase hex.
 */

import {
  md5,
  sha1,
  sha256,
  sha384,
  sha512,
  sha3,
  keccak,
  ripemd160,
  crc32,
  blake2b,
} from "hash-wasm";

export interface HashResult {
  algo: string;
  value: string;
}

/** Ordered list of algorithms with their hash-wasm invocation. */
const ALGORITHMS: { algo: string; run: (text: string) => Promise<string> }[] = [
  { algo: "MD5", run: (t) => md5(t) },
  { algo: "SHA-1", run: (t) => sha1(t) },
  { algo: "SHA-256", run: (t) => sha256(t) },
  { algo: "SHA-384", run: (t) => sha384(t) },
  { algo: "SHA-512", run: (t) => sha512(t) },
  { algo: "SHA3-256", run: (t) => sha3(t, 256) },
  { algo: "SHA3-512", run: (t) => sha3(t, 512) },
  { algo: "Keccak-256", run: (t) => keccak(t, 256) },
  { algo: "RIPEMD-160", run: (t) => ripemd160(t) },
  { algo: "BLAKE2b-256", run: (t) => blake2b(t, 256) },
  { algo: "CRC32", run: (t) => crc32(t) },
];

/** The labels, in display order — handy for rendering placeholders. */
export const HASH_ALGORITHMS: string[] = ALGORITHMS.map((a) => a.algo);

/**
 * Hash `text` with every supported algorithm. Runs all digests concurrently
 * with Promise.all and preserves the declared order in the result.
 */
export async function hashAllText(text: string): Promise<HashResult[]> {
  const values = await Promise.all(ALGORITHMS.map((a) => a.run(text)));
  return ALGORITHMS.map((a, i) => ({ algo: a.algo, value: values[i] }));
}
