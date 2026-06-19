import { describe, expect, it } from "vitest";
import { computeHmac, decodeKey } from "./logic";

describe("hmac", () => {
  it("computes the canonical HMAC-SHA256 test vector", async () => {
    const hex = await computeHmac(
      "The quick brown fox jumps over the lazy dog",
      "key",
      "sha256",
    );
    expect(hex).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    );
  });

  it("matches well-known empty-key/empty-message MD5/SHA-1 vectors", async () => {
    expect(await computeHmac("", "", "md5")).toBe(
      "74e6f7298a9c2d168935f58c001bad88",
    );
    expect(await computeHmac("", "", "sha1")).toBe(
      "fbdb1d1b18aa6c08324b7d64b71fb76370690e1d",
    );
  });

  it("supports SHA-512", async () => {
    const hex = await computeHmac("data", "key", "sha512");
    expect(hex).toMatch(/^[0-9a-f]{128}$/);
  });

  it("accepts a string key (UTF-8) and equivalent byte key", async () => {
    const fromString = await computeHmac("msg", "key", "sha256");
    const fromBytes = await computeHmac(
      "msg",
      decodeKey("key", "utf-8"),
      "sha256",
    );
    expect(fromString).toBe(fromBytes);
  });

  it("decodes hex keys to the same bytes as their UTF-8 source", async () => {
    // "key" in hex is 6b6579.
    const viaHex = await computeHmac(
      "The quick brown fox jumps over the lazy dog",
      decodeKey("6b6579", "hex"),
      "sha256",
    );
    expect(viaHex).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    );
  });

  it("decodes base64 keys", async () => {
    // "key" in base64 is a2V5.
    const viaB64 = await computeHmac(
      "The quick brown fox jumps over the lazy dog",
      decodeKey("a2V5", "base64"),
      "sha256",
    );
    expect(viaB64).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    );
  });

  it("decodeKey handles empty and whitespace input", () => {
    expect(decodeKey("", "utf-8")).toEqual(new Uint8Array(0));
    expect(decodeKey("  ", "hex")).toEqual(new Uint8Array(0));
    expect(decodeKey("", "base64")).toEqual(new Uint8Array(0));
  });

  it("decodeKey throws on invalid hex", () => {
    expect(() => decodeKey("zz", "hex")).toThrow();
    expect(() => decodeKey("abc", "hex")).toThrow();
  });

  it("decodeKey throws on invalid base64", () => {
    expect(() => decodeKey("*invalid*", "base64")).toThrow();
  });
});
