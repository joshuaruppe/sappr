import { describe, expect, it } from "vitest";
import { defang, refang, extractIocs } from "./logic";

describe("defang / refang", () => {
  it("defangs a URL", () => {
    expect(defang("http://a.com")).toBe("hxxp[://]a[.]com");
  });

  it("defangs https and an email", () => {
    expect(defang("https://x.io")).toBe("hxxps[://]x[.]io");
    expect(defang("user@x.com")).toBe("user[@]x[.]com");
  });

  it("refangs the common notations", () => {
    expect(refang("hxxps[://]evil[.]example[.]com")).toBe("https://evil.example.com");
    expect(refang("bad[@]phish(.)net")).toBe("bad@phish.net");
    expect(refang("a[dot]b_dot_c")).toBe("a.b.c");
  });

  it("round-trips defang → refang", () => {
    const url = "https://sub.evil.com/p?x=1";
    expect(refang(defang(url))).toBe(url);
  });

  it("leaves bare 'dot'/'at' words in prose alone", () => {
    expect(refang("meet at the spot")).toBe("meet at the spot");
  });
});

describe("extractIocs", () => {
  it("refangs, then extracts by type", () => {
    const r = extractIocs(
      "hit hxxps://evil[.]example[.]com/x from 10[.]0[.]0[.]5, mail a[@]b[.]io, md5 44d88612fea8a8f36de82e1278abb02f",
    );
    expect(r.urls).toContain("https://evil.example.com/x");
    expect(r.ipv4).toContain("10.0.0.5");
    expect(r.emails).toContain("a@b.io");
    expect(r.hashes).toContain("44d88612fea8a8f36de82e1278abb02f");
  });

  it("rejects invalid IPv4 octets", () => {
    expect(extractIocs("999.1.2.3 and 10.20.30.40").ipv4).toEqual(["10.20.30.40"]);
  });

  it("extracts a SHA-256 hash", () => {
    const sha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    expect(extractIocs(sha256).hashes).toContain(sha256);
  });

  it("returns empty groups for IOC-free text", () => {
    const r = extractIocs("just some ordinary words here");
    expect(r.urls).toEqual([]);
    expect(r.ipv4).toEqual([]);
    expect(r.hashes).toEqual([]);
  });
});
