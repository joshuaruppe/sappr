import { describe, expect, it } from "vitest";
import { hashAllText, HASH_ALGORITHMS } from "./logic";

function valueOf(results: { algo: string; value: string }[], algo: string) {
  const r = results.find((x) => x.algo === algo);
  if (!r) throw new Error(`missing ${algo}`);
  return r.value;
}

describe("hash-text", () => {
  it("returns one result per algorithm, in order", async () => {
    const results = await hashAllText("abc");
    expect(results.map((r) => r.algo)).toEqual(HASH_ALGORITHMS);
  });

  it("matches the MD5 of the empty string", async () => {
    const results = await hashAllText("");
    expect(valueOf(results, "MD5")).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });

  it("matches the SHA-256 of 'abc'", async () => {
    const results = await hashAllText("abc");
    expect(valueOf(results, "SHA-256")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("matches the SHA-1 of 'abc'", async () => {
    const results = await hashAllText("abc");
    expect(valueOf(results, "SHA-1")).toBe(
      "a9993e364706816aba3e25717850c26c9cd0d89d",
    );
  });

  it("produces lowercase hex for every algorithm", async () => {
    const results = await hashAllText("hello world");
    for (const { value } of results) {
      expect(value).toMatch(/^[0-9a-f]+$/);
    }
  });

  it("hashes UTF-8 text without throwing", async () => {
    const results = await hashAllText("héllo 🌍");
    expect(results).toHaveLength(HASH_ALGORITHMS.length);
    for (const { value } of results) {
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
