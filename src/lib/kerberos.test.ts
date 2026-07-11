import { describe, it, expect } from "vitest";
import { parseKirbi } from "./kerberos";

// Fully synthetic KRB-CRED .kirbi (fabricated, NOT a real ticket): an EXAMPLE.LOCAL
// krbtgt TGT for user jdoe, AES256, with obviously-fake session-key and cipher bytes.
const SYNTH_KIRBI =
  "doIBjzCCAYugAwIBBaEDAgEWooGDMIGAYX4wfKADAgEFoQ8bDUVYQU1QTEUuTE9DQUyiIjAgoAMCAQKhGTAXGwZrcmJ0Z3QbDUVYQU1QTEUuTE9DQUyjQDA+oAMCARKhAwIBAqIyBDCrq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6ujgfgwgfWgAwIBAKKB7QSB6n2B5zCB5KCB4TCB3jCB26ArMCmgAwIBEqEiBCAAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eH6EPGw1FWEFNUExFLkxPQ0FMohEwD6ADAgEBoQgwBhsEamRvZaMHAwUAQOAAAKQRGA8yMDI2MDEwMTEyMDAwMFqlERgPMjAyNjAxMDExMjAwMDBaphEYDzIwMjYwMTAxMjIwMDAwWqcRGA8yMDI2MDEwODEyMDAwMFqoDxsNRVhBTVBMRS5MT0NBTKkiMCCgAwIBAqEZMBcbBmtyYnRndBsNRVhBTVBMRS5MT0NBTA==";

function bytes(b: string): Uint8Array {
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

describe("kerberos .kirbi decoder", () => {
  const cred = parseKirbi(bytes(SYNTH_KIRBI));

  it("recognizes it as a KRB-CRED TGT", () => {
    expect(cred).not.toBeNull();
    expect(cred!.isTgt).toBe(true);
    expect(cred!.credEncrypted).toBe(false); // .kirbi cred part is unencrypted
  });

  it("reads the ticket reference", () => {
    const t = cred!.tickets[0];
    expect(t.realm).toBe("EXAMPLE.LOCAL");
    expect(t.sname.name).toBe("krbtgt/EXAMPLE.LOCAL");
    expect(t.encPart.etype).toBe(18); // aes256
  });

  it("reads client, service, flags and validity from the cred part", () => {
    const i = cred!.info[0];
    expect(i.client?.name).toBe("jdoe");
    expect(i.clientRealm).toBe("EXAMPLE.LOCAL");
    expect(i.service?.name).toBe("krbtgt/EXAMPLE.LOCAL");
    expect(i.flags).toEqual(
      expect.arrayContaining(["forwardable", "renewable", "initial", "pre_authent"]),
    );
    expect(i.startTime?.display).toBe("2026-01-01 12:00:00 UTC");
    expect(i.endTime?.display).toBe("2026-01-01 22:00:00 UTC");
    expect(i.renewTill?.display).toBe("2026-01-08 12:00:00 UTC");
  });

  it("extracts the session key", () => {
    const i = cred!.info[0];
    expect(i.keyType).toBe(18);
    expect(i.keyHex).toBe("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
  });

  it("returns null for non-kirbi input", () => {
    expect(parseKirbi(new TextEncoder().encode("nope"))).toBeNull();
  });
});
