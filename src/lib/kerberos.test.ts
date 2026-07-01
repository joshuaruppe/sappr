import { describe, it, expect } from "vitest";
import { parseKirbi } from "./kerberos";

// A real TGT .kirbi (Rubeus `asktgt` output) from a CRTO lab — not real creds.
// TGT for krbtgt/contoso.com, user ngreen, AES256.
const NGREEN_KIRBI =
  "doIFmDCCBZSgAwIBBaEDAgEWooIEojCCBJ5hggSaMIIElqADAgEFoQ0bC0NPTlRPU08uQ09NoiAwHqADAgECoRcwFRsGa3JidGd0Gwtjb250b3NvLmNvbaOCBFwwggRYoAMCARKhAwIBAqKCBEoEggRGY167RFJ10cNWI3PA0MpYQMo4kD9nz5fvO75u0y70dRkJ/1Ku3fsJ0Y2Vsoir7EoLnlif6Ur3WFLxLdSS8hPWbGW1XWsmM1fY6ZulVWT3yzGN5lMP2ax4nDZ+4hnTflT7u9Oahw7E7fjusVVmrwxIhkh2uY9d/A+AmBZ9XZ/HCUREpdM08bG4LPXDA4PGOTAtLflHj6O67eMt7OMu+gpJh64aiEm1NB8ZDhcUF/s33f/v0fV0TwxNpTF6FzrZiXJafRjSXUSWQm5Q8oFtX4ao8e9JZi0IYT9fARxGeEoojoBEU+RbZVF2JY+QMCxxqZocF47xEpukbauJuS9lvWUO9eLmT6lgWCeYc06ctTc+H31iSKXtcweByPzIQhpeaEoYNnpR8gB8y78375KWiLCr5WIbCKaQfxb6oHG8eotnD05m8xa3uM062EDa9oBA101VlsTGL26PQoOHnVzMWvpGV/BXS9q75H6yhDBhxfpBRZrzfYBKcNptBHpG8HYQSau3nqbO95FbkqAIlfXkEQ3hPTG2MPG6T1ty2sZnjVDmLC6PyoYfUOx8H7sdrnqnMWUkHKBrL3B9NIFQiNtJOJsfmPI3ESKrtfS+4+IgXKzSL1Bu6PxJrBX8CMOn5bZgHkZCF1Tqd3zfzNCGkkPbUnLCnjgd6GMZcTWTLUqHeimoFOq9zLnDrFVaNXo6jHcd2mtf5OzFsoS1+58NeaKE1BFvap+kfB6aifBJlZe6+c1W5bWHV3g0S7N6jg2LPjVh8GbzTS3mFUM0C3IPnHs827mR10XiZUEc7r/4fKcRMg0spLqpOwBdw+A4MxYgMmHuO0/zRrh9Y05QC5J+i5EN4rnXjz69FzsavEE6QZhSeCAkHwOsDELjeZ8oOdtAj4XfV2MogZuVYh3FW9tgViJz2F8ZEBeSFDXkE5YAb0d/I2NiUrK9izEQe+aspnpAlHH9Af+ZkubWgVye3Ow+0zkTNR4NGGem78ZEk9U9j2KssKK4jNYe2CZmDt49YDbY4UJ1/No4NK8oDn5BmJbnmvB6z1UYSg+pKPoHN7O1IrGuRt+jPsdtieqMF6URqyncXUh3MHEPRbDBZ6xY0FtB7die42/RbLRG23zNhvqYAJlq0kUaBQua2ds/if8oMrATSW5fqJ0OS9fse5MUS4TQDhE/yzRWLQcmnOhdu3a+sKOr25PVC1KBWhAQlPisYWrh/8vDA19ZWzWjfHp/gFYoImv7adLZ1eJumtZ6l6wyhrLqgVHVrEI2ZmJslnqQ7QPQ5WYh1umhV+fzhDBt9KuIX20liMKU3jQAqX+9kjEPMUBaVxtcgZAJg5PAZQTb54/ejUNQTm+9p4Qh47GK9t8sopDVSlF0JvrVtBvssQoowprj76h8X+grigy2Q5qOmqKYpvzGNpwOTRbg7ByNFktLOaJ6jB70aKGTpyrKJ76qciXUFArntTHPciVqCQOjgeEwgd6gAwIBAKKB1gSB032B0DCBzaCByjCBxzCBxKArMCmgAwIBEqEiBCAEeczH6NgnLmuH4p5aYclbMPpcc33j6Wf60FStvoPBQKENGwtDT05UT1NPLkNPTaITMBGgAwIBAaEKMAgbBm5ncmVlbqMHAwUAQOEAAKURGA8yMDI2MDYzMDE4MjE0NVqmERgPMjAyNjA3MDEwNDIxNDVapxEYDzIwMjYwNzA3MTgyMTQ1WqgNGwtDT05UT1NPLkNPTakgMB6gAwIBAqEXMBUbBmtyYnRndBsLY29udG9zby5jb20=";

function bytes(b: string): Uint8Array {
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

describe("kerberos .kirbi decoder", () => {
  const cred = parseKirbi(bytes(NGREEN_KIRBI));

  it("recognizes it as a KRB-CRED TGT", () => {
    expect(cred).not.toBeNull();
    expect(cred!.isTgt).toBe(true);
    expect(cred!.credEncrypted).toBe(false); // .kirbi cred part is unencrypted
  });

  it("reads the ticket reference", () => {
    const t = cred!.tickets[0];
    expect(t.realm).toBe("CONTOSO.COM");
    expect(t.sname.name).toBe("krbtgt/contoso.com");
    expect(t.encPart.etype).toBe(18); // aes256
  });

  it("reads client, service, flags and validity from the cred part", () => {
    const i = cred!.info[0];
    expect(i.client?.name).toBe("ngreen");
    expect(i.clientRealm).toBe("CONTOSO.COM");
    expect(i.service?.name).toBe("krbtgt/contoso.com");
    expect(i.flags).toEqual(
      expect.arrayContaining([
        "forwardable",
        "renewable",
        "initial",
        "pre_authent",
        "name_canonicalize",
      ]),
    );
    expect(i.startTime?.display).toBe("2026-06-30 18:21:45 UTC");
    expect(i.endTime?.display).toBe("2026-07-01 04:21:45 UTC");
    expect(i.renewTill?.display).toBe("2026-07-07 18:21:45 UTC");
  });

  it("extracts the session key", () => {
    const i = cred!.info[0];
    expect(i.keyType).toBe(18);
    expect(i.keyBase64).toBe("BHnMx+jYJy5rh+KeWmHJWzD6XHN94+ln+tBUrb6DwUA=");
  });

  it("returns null for non-kirbi input", () => {
    expect(parseKirbi(new TextEncoder().encode("nope"))).toBeNull();
  });
});
