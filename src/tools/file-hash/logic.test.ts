import { describe, expect, it } from "vitest";
import { hashBytes } from "./logic";

describe("file-hash", () => {
  it('computes MD5/SHA-1/SHA-256 for "abc"', async () => {
    const bytes = new TextEncoder().encode("abc");
    const out = await hashBytes(bytes);
    expect(out.md5).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(out.sha1).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
    expect(out.sha256).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("computes the empty-input digests", async () => {
    const out = await hashBytes(new Uint8Array(0));
    expect(out.md5).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(out.sha1).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
    expect(out.sha256).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("produces lowercase hex of the expected lengths", async () => {
    const out = await hashBytes(new TextEncoder().encode("sappr"));
    expect(out.md5).toMatch(/^[0-9a-f]{32}$/);
    expect(out.sha1).toMatch(/^[0-9a-f]{40}$/);
    expect(out.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
