import { describe, expect, it } from "vitest";
import {
  encryptAes,
  decryptAes,
  type AesCipher,
  type AesOptions,
} from "./logic";

function pass(cipher: AesCipher, key = "correct horse"): AesOptions {
  return { cipher, keyType: "passphrase", key };
}

describe("aes", () => {
  it("round-trips with a passphrase for AES-GCM", async () => {
    const msg = "héllo 🌍 secret";
    const ct = await encryptAes(msg, pass("AES-GCM"));
    expect(ct).not.toBe("");
    expect(ct).not.toContain(msg);
    expect(await decryptAes(ct, pass("AES-GCM"))).toBe(msg);
  });

  it("round-trips with a passphrase for AES-CBC", async () => {
    const msg = "block cipher payload, padded.";
    const ct = await encryptAes(msg, pass("AES-CBC"));
    expect(await decryptAes(ct, pass("AES-CBC"))).toBe(msg);
  });

  it("fails to decrypt with the wrong passphrase", async () => {
    const ct = await encryptAes("top secret", pass("AES-GCM", "right key"));
    await expect(
      decryptAes(ct, pass("AES-GCM", "wrong key")),
    ).rejects.toThrow();
  });

  it("produces different ciphertext each time (random salt + IV)", async () => {
    const a = await encryptAes("same input", pass("AES-GCM"));
    const b = await encryptAes("same input", pass("AES-GCM"));
    expect(a).not.toBe(b);
  });

  it("round-trips with a raw hex key", async () => {
    const key = "00112233445566778899aabbccddeeff"; // 16 bytes
    const opts: AesOptions = { cipher: "AES-GCM", keyType: "hex", key };
    const ct = await encryptAes("raw key message", opts);
    expect(await decryptAes(ct, opts)).toBe("raw key message");
  });

  it("rejects raw keys of the wrong length", async () => {
    const opts: AesOptions = {
      cipher: "AES-GCM",
      keyType: "hex",
      key: "00112233", // 4 bytes
    };
    await expect(encryptAes("x", opts)).rejects.toThrow();
  });

  it("returns empty string for empty input", async () => {
    expect(await encryptAes("", pass("AES-GCM"))).toBe("");
    expect(await decryptAes("", pass("AES-GCM"))).toBe("");
  });

  it("requires a key when input is present", async () => {
    await expect(
      encryptAes("data", pass("AES-GCM", "")),
    ).rejects.toThrow();
  });

  it("rejects garbage ciphertext", async () => {
    await expect(
      decryptAes("not-valid-container", pass("AES-GCM")),
    ).rejects.toThrow();
  });

  it("errors when key type does not match the container", async () => {
    const ct = await encryptAes("hi", pass("AES-GCM"));
    // Container was made with a passphrase; try to decrypt as a raw key.
    await expect(
      decryptAes(ct, {
        cipher: "AES-GCM",
        keyType: "hex",
        key: "00112233445566778899aabbccddeeff",
      }),
    ).rejects.toThrow();
  });
});
