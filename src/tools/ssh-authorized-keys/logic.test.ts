import { describe, expect, it } from "vitest";
import { analyzeAuthorizedKeys } from "./logic";

function toB64(bytes: number[]): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function field(bytes: number[]): number[] {
  const n = bytes.length;
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff, ...bytes];
}
function str(s: string): number[] {
  return Array.from(new TextEncoder().encode(s));
}
function ed25519Blob(): string {
  return toB64([...field(str("ssh-ed25519")), ...field(new Array(32).fill(7))]);
}
function rsaBlob(nBytes: number): string {
  const n = new Array(nBytes).fill(0);
  n[0] = 0x80; // top bit set → exactly nBytes*8 bits
  return toB64([...field(str("ssh-rsa")), ...field([1, 0, 1]), ...field(n)]);
}
function dssBlob(): string {
  const big = new Array(128).fill(1);
  big[0] = 0x80;
  return toB64([
    ...field(str("ssh-dss")),
    ...field(big),
    ...field(new Array(20).fill(1)),
    ...field(big),
    ...field(big),
  ]);
}

describe("analyzeAuthorizedKeys", () => {
  it("parses a restricted key with options and fingerprints it", async () => {
    const line = `command="/usr/bin/false",from="10.0.0.5" ssh-ed25519 ${ed25519Blob()} backup@host`;
    const r = await analyzeAuthorizedKeys(line);
    expect(r.keys).toHaveLength(1);
    const k = r.keys[0];
    expect(k.type).toBe("ssh-ed25519");
    expect(k.comment).toBe("backup@host");
    expect(k.restricted).toBe(true);
    expect(k.options).toContain('command="/usr/bin/false"');
    expect(k.fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]{43}$/);
  });

  it("flags an unrestricted key as medium", async () => {
    const r = await analyzeAuthorizedKeys(`ssh-ed25519 ${ed25519Blob()} admin@host`);
    expect(r.keys[0].restricted).toBe(false);
    expect(r.findings.some((f) => f.severity === "medium" && /Unrestricted/.test(f.message))).toBe(
      true,
    );
  });

  it("flags a DSA key as high", async () => {
    const r = await analyzeAuthorizedKeys(`ssh-dss ${dssBlob()} legacy@host`);
    expect(r.findings.some((f) => f.severity === "high" && /DSA/.test(f.message))).toBe(true);
  });

  it("computes RSA bit length and flags weak (1024-bit) keys", async () => {
    const weak = await analyzeAuthorizedKeys(`ssh-rsa ${rsaBlob(128)} weak@host`);
    expect(weak.keys[0].bits).toBe(1024);
    expect(weak.findings.some((f) => f.severity === "high" && /1024-bit RSA/.test(f.message))).toBe(
      true,
    );

    const strong = await analyzeAuthorizedKeys(`ssh-rsa ${rsaBlob(384)} strong@host`);
    expect(strong.keys[0].bits).toBe(3072);
    expect(strong.findings.some((f) => /RSA/.test(f.message) && f.severity === "high")).toBe(false);
  });

  it("ignores comments and errors when no keys are present", async () => {
    const r = await analyzeAuthorizedKeys("# a comment\n\nnot a key line");
    expect(r.error).not.toBe("");
  });
});
