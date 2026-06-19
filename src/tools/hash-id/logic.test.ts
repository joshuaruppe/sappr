import { describe, expect, it } from "vitest";
import { identifyHash, buildHashcatCommand, buildJohnCommand } from "./logic";

describe("hash identifier", () => {
  it("identifies a Kerberoasting TGS-REP (etype 23) with hashcat + john", () => {
    const hash =
      "$krb5tgs$23$*svc_account$CONTOSO.LOCAL$MSSQLSvc/sql01.contoso.local:1433*$a1b2c3d4e5f60718293a4b5c6d7e8f90$1f2e3d4c5b6a79880192a3b4c5d6e7f8091a2b3c4d5e6f7081";
    const [top] = identifyHash(hash);
    expect(top.id).toBe("krb5tgs-23");
    expect(top.name).toMatch(/TGS-REP/);
    expect(top.category).toMatch(/Kerberos/);
    expect(top.hashcatMode).toBe(13100);
    expect(top.johnFormat).toBe("krb5tgs");
    expect(top.hashcatCommand).toContain("-m 13100");
    expect(top.johnCommand).toContain("--format=krb5tgs");
  });

  it("identifies AS-REP roasting and TGS aes variants", () => {
    expect(identifyHash("$krb5asrep$23$user@REALM:abcd$ef01")[0].hashcatMode).toBe(
      18200,
    );
    expect(identifyHash("$krb5tgs$17$*a$b$c*$dd$ee")[0].hashcatMode).toBe(19600);
    expect(identifyHash("$krb5tgs$18$*a$b$c*$dd$ee")[0].hashcatMode).toBe(19700);
  });

  it("identifies NetNTLMv2", () => {
    const v2 =
      "admin::WORKGROUP:1122334455667788:88dcbe4446168966a153a0064958dac6:0101000000000000abcdef0123456789";
    const [top] = identifyHash(v2);
    expect(top.id).toBe("netntlmv2");
    expect(top.hashcatMode).toBe(5600);
  });

  it("identifies Linux shadow and bcrypt by prefix", () => {
    expect(identifyHash("$6$abc$def")[0].hashcatMode).toBe(1800);
    expect(identifyHash("$1$abc$def")[0].hashcatMode).toBe(500);
    expect(identifyHash("$2b$12$abcdefghijklmnopqrstuv")[0].hashcatMode).toBe(
      3200,
    );
    expect(identifyHash("$y$j9T$abcdef")[0].id).toBe("yescrypt");
  });

  it("identifies a JWT", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcDEF123_-xyz";
    expect(identifyHash(jwt)[0].hashcatMode).toBe(16500);
  });

  it("lists ambiguous 32-hex candidates with MD5 and NTLM", () => {
    const cands = identifyHash("d41d8cd98f00b204e9800998ecf8427e");
    const ids = cands.map((c) => c.id);
    expect(ids).toContain("md5");
    expect(ids).toContain("ntlm");
    expect(cands.find((c) => c.id === "ntlm")?.hashcatMode).toBe(1000);
    expect(cands.find((c) => c.id === "md5")?.hashcatMode).toBe(0);
  });

  it("classifies raw hashes by length", () => {
    expect(identifyHash("a".repeat(64))[0].id).toBe("sha256");
    expect(identifyHash("a".repeat(40))[0].id).toBe("sha1");
    expect(identifyHash("a".repeat(128))[0].id).toBe("sha512");
  });

  it("identifies MSSQL 2005 (mode 132) with and without the 0x prefix", () => {
    // hashcat example: 0x01004086ceb6...<8-hex salt><40-hex SHA1>
    const withPrefix =
      "0x01004086ceb6bf932bc4151a1af1f13cd17301d70816a8886908";
    const withoutPrefix = "4086ceb6bf932bc4151a1af1f13cd17301d70816a8886908";
    const a = identifyHash(withPrefix).find((c) => c.id === "mssql2005");
    const b = identifyHash(withoutPrefix).find((c) => c.id === "mssql2005");
    expect(a?.hashcatMode).toBe(132);
    expect(b?.hashcatMode).toBe(132);
    expect(a?.johnFormat).toBe("mssql05");
  });

  it("identifies MSSQL 2012 (mode 1731) with and without the 0x prefix", () => {
    // hashcat example: 0x0200<8-hex salt><128-hex SHA512>
    const salt = "f9b3a2c1";
    const sha512 = "ab".repeat(64); // 128 hex chars
    const withPrefix = `0x0200${salt}${sha512}`;
    const withoutPrefix = `${salt}${sha512}`;
    const a = identifyHash(withPrefix).find((c) => c.id === "mssql2012");
    const b = identifyHash(withoutPrefix).find((c) => c.id === "mssql2012");
    expect(a?.hashcatMode).toBe(1731);
    expect(b?.hashcatMode).toBe(1731);
    expect(a?.johnFormat).toBe("mssql12");

    // The 0x0200 version marker is trusted even when the body length is off
    // (e.g. a malformed/truncated paste).
    const odd = "0x0200" + "a1b2c3d4e5f6".repeat(12);
    expect(
      identifyHash(odd).find((c) => c.id === "mssql2012")?.hashcatMode,
    ).toBe(1731);
  });

  it("flags a 0x0200-marked hash with a wrong body length as malformed", () => {
    const odd = "0x0200" + "ab".repeat(80); // 160 hex, not the required 136
    const c = identifyHash(odd).find((x) => x.id === "mssql2012");
    expect(c?.hashcatMode).toBe(1731);
    expect(c?.warning).toMatch(/malformed|136|hex/i);
  });

  it("builds crack commands with custom flags", () => {
    const hc = buildHashcatCommand(13100, {
      workload: 3,
      device: "1,2",
      optimized: true,
      wordlist: "/wl.txt",
    });
    expect(hc).toContain("-w 3");
    expect(hc).toContain("-d 1,2");
    expect(hc).toContain(" -O ");
    expect(hc).toContain("/wl.txt");

    expect(hc).toContain("/wl.txt");

    const jn = buildJohnCommand("krb5tgs", { johnFork: 8, wordlist: "/wl.txt" });
    expect(jn).toContain("--fork=8");
    expect(jn).toContain("--wordlist=/wl.txt");
  });

  it("only appends a wordlist/rules when provided (no baked-in defaults)", () => {
    expect(buildHashcatCommand(0)).toBe("hashcat -m 0 -a 0 hash.txt");
    expect(buildJohnCommand("nt")).toBe("john --format=nt hash.txt");
    expect(buildHashcatCommand(0, { rules: "best64.rule" })).toContain(
      "-r best64.rule",
    );
    // Wordlist is the trailing positional arg for hashcat.
    expect(buildHashcatCommand(0, { wordlist: "/wl.txt" })).toBe(
      "hashcat -m 0 -a 0 hash.txt /wl.txt",
    );
  });

  it("returns empty for empty or unmatched input", () => {
    expect(identifyHash("")).toEqual([]);
    expect(identifyHash("   ")).toEqual([]);
    expect(identifyHash("not a hash!!")).toEqual([]);
  });
});
