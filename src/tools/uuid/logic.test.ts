import { describe, expect, it } from "vitest";
import { generate, uuidV7, NIL_UUID } from "./logic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V7_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CROCKFORD = /^[0-9A-HJKMNP-TV-Z]{26}$/;

describe("uuid/ulid generator", () => {
  it("generates v4 UUIDs matching the canonical pattern", () => {
    for (const id of generate("v4", 10)) {
      expect(id).toMatch(UUID_RE);
      expect(id).toMatch(UUID_V4_RE);
    }
  });

  it("generates v7 UUIDs with version nibble 7 (13th char) and correct variant", () => {
    for (const id of generate("v7", 10)) {
      expect(id).toMatch(UUID_V7_RE);
      expect(id[14]).toBe("7"); // version nibble position in the string
    }
  });

  it("encodes a big-endian millisecond timestamp in v7", () => {
    const now = 0x0123456789ab;
    const id = uuidV7(now);
    const hex = id.replace(/-/g, "");
    expect(hex.slice(0, 12)).toBe("0123456789ab");
  });

  it("generates ULIDs as 26 Crockford base32 chars", () => {
    for (const id of generate("ulid", 10)) {
      expect(id).toHaveLength(26);
      expect(id).toMatch(CROCKFORD);
    }
  });

  it("generates the NIL UUID", () => {
    expect(generate("nil", 3)).toEqual([NIL_UUID, NIL_UUID, NIL_UUID]);
    expect(NIL_UUID).toMatch(UUID_RE);
  });

  it("respects the requested count and clamps the range", () => {
    expect(generate("v4", 1)).toHaveLength(1);
    expect(generate("v4", 50)).toHaveLength(50);
    expect(generate("v4", 0)).toHaveLength(0);
    expect(generate("v4", 999)).toHaveLength(100);
  });

  it("produces unique random ids", () => {
    const ids = generate("v4", 20);
    expect(new Set(ids).size).toBe(20);
  });
});
