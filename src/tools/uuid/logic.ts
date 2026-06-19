/**
 * Identifier generators — UUID v4, UUID v7, ULID and the NIL UUID.
 * Pure functions; rely only on Web Crypto and Date, which exist in both the
 * browser and Node.
 */

import { ulid } from "ulid";

export type IdType = "v4" | "v7" | "ulid" | "nil";

export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/** Format a 16-byte array as a canonical lowercase UUID string. */
function bytesToUuid(bytes: Uint8Array): string {
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i].toString(16).padStart(2, "0"));
  }
  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}

/**
 * UUID v7: 48-bit big-endian Unix-ms timestamp, version 7 nibble, variant bits,
 * and the remaining 74 bits from a CSPRNG.
 */
export function uuidV7(now: number = Date.now()): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const ts = Math.floor(now);
  // 48-bit timestamp, big-endian, into bytes 0..5.
  bytes[0] = (ts / 2 ** 40) & 0xff;
  bytes[1] = (ts / 2 ** 32) & 0xff;
  bytes[2] = (ts / 2 ** 24) & 0xff;
  bytes[3] = (ts / 2 ** 16) & 0xff;
  bytes[4] = (ts / 2 ** 8) & 0xff;
  bytes[5] = ts & 0xff;

  // Version 7 in the high nibble of byte 6.
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // Variant (10xx) in the high bits of byte 8.
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}

function generateOne(type: IdType): string {
  switch (type) {
    case "v4":
      return crypto.randomUUID();
    case "v7":
      return uuidV7();
    case "ulid":
      return ulid();
    case "nil":
      return NIL_UUID;
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown id type: ${String(_exhaustive)}`);
    }
  }
}

/** Generate `count` identifiers of the given `type`. */
export function generate(type: IdType, count: number): string[] {
  const n = Math.max(0, Math.min(100, Math.floor(count)));
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(generateOne(type));
  return out;
}
