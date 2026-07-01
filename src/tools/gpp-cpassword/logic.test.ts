import { describe, it, expect } from "vitest";
import { decryptCpassword } from "./logic";

describe("GPP cpassword decrypter", () => {
  it("decrypts the well-known sample cpassword", async () => {
    // A well-known GPP cpassword sample.
    const pw = await decryptCpassword("j1Uyj3Vx8TY9LtLZil2uAuZkFQA/4latT76ZwgdHdhw");
    expect(pw).toBe("Local*P4ssword!");
  });

  it("returns empty for empty input", async () => {
    expect(await decryptCpassword("   ")).toBe("");
  });

  it("rejects input that is not valid Base64", async () => {
    await expect(decryptCpassword("not base64 !!!")).rejects.toThrow();
  });
});
