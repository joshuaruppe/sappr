/**
 * Streaming file hashing with hash-wasm. Computes MD5, SHA-1 and SHA-256 in a
 * single pass over the file, reading it in fixed-size chunks so large files do
 * not have to be held in memory all at once. Pure logic — no DOM/React.
 */

import { createMD5, createSHA1, createSHA256 } from "hash-wasm";

export interface FileHashes {
  md5: string;
  sha1: string;
  sha256: string;
}

/** Chunk size used when slicing the file (8 MiB). */
export const CHUNK_SIZE = 8 * 1024 * 1024;

/**
 * Hash raw bytes through the same three hashers used for files. Useful in
 * environments where `File`/`Blob` are unavailable (e.g. Node tests).
 */
export async function hashBytes(bytes: Uint8Array): Promise<FileHashes> {
  const [md5, sha1, sha256] = await Promise.all([
    createMD5(),
    createSHA1(),
    createSHA256(),
  ]);
  md5.init();
  sha1.init();
  sha256.init();

  md5.update(bytes);
  sha1.update(bytes);
  sha256.update(bytes);

  return {
    md5: md5.digest("hex"),
    sha1: sha1.digest("hex"),
    sha256: sha256.digest("hex"),
  };
}

/**
 * Hash a `File`/`Blob` by streaming it in {@link CHUNK_SIZE} slices. The
 * optional `onProgress` callback receives a value in [0, 1].
 */
export async function hashFile(
  file: Blob,
  onProgress?: (fraction: number) => void,
): Promise<FileHashes> {
  const [md5, sha1, sha256] = await Promise.all([
    createMD5(),
    createSHA1(),
    createSHA256(),
  ]);
  md5.init();
  sha1.init();
  sha256.init();

  const size = file.size;
  if (size === 0) {
    onProgress?.(1);
    return {
      md5: md5.digest("hex"),
      sha1: sha1.digest("hex"),
      sha256: sha256.digest("hex"),
    };
  }

  for (let offset = 0; offset < size; offset += CHUNK_SIZE) {
    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const bytes = new Uint8Array(await slice.arrayBuffer());
    md5.update(bytes);
    sha1.update(bytes);
    sha256.update(bytes);
    onProgress?.(Math.min(1, (offset + bytes.length) / size));
  }

  return {
    md5: md5.digest("hex"),
    sha1: sha1.digest("hex"),
    sha256: sha256.digest("hex"),
  };
}
