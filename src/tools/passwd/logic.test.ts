import { describe, expect, it } from "vitest";
import { parseAccounts } from "./logic";

describe("parseAccounts", () => {
  it("parses a passwd line into fields", () => {
    const r = parseAccounts("www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin");
    expect(r.passwd).toHaveLength(1);
    const e = r.passwd[0];
    expect(e.name).toBe("www-data");
    expect(e.uid).toBe(33);
    expect(e.gid).toBe(33);
    expect(e.shell).toBe("/usr/sbin/nologin");
    expect(e.loginShell).toBe(false);
  });

  it("flags a non-root UID 0 account as high severity", () => {
    const r = parseAccounts(
      "root:x:0:0:root:/root:/bin/bash\nbackdoor:x:0:0::/root:/bin/bash",
    );
    const hit = r.findings.find((f) => f.account === "backdoor");
    expect(hit?.severity).toBe("high");
    expect(hit?.message).toMatch(/UID 0/);
  });

  it("flags an inline password hash in /etc/passwd", () => {
    const r = parseAccounts("legacy:$6$abc$def:1001:1001::/home/legacy:/bin/sh");
    expect(r.findings.some((f) => /not shadowed/.test(f.message))).toBe(true);
  });

  it("classifies shadow hash schemes and flags weak ones", () => {
    const r = parseAccounts(
      [
        "alice:$6$salt$hashhashhash:19700:0:99999:7:::",
        "bob:$1$salt$oldmd5hash:19700:0:99999:7:::",
      ].join("\n"),
    );
    const alice = r.shadow.find((s) => s.name === "alice")!;
    const bob = r.shadow.find((s) => s.name === "bob")!;
    expect(alice.scheme).toBe("sha512crypt");
    expect(alice.weak).toBe(false);
    expect(bob.scheme).toBe("md5crypt");
    expect(bob.weak).toBe(true);
    expect(r.findings.some((f) => f.account === "bob" && f.severity === "medium")).toBe(true);
  });

  it("flags an empty shadow password as high severity", () => {
    const r = parseAccounts("guest::19700:0:99999:7:::");
    const hit = r.findings.find((f) => f.account === "guest");
    expect(hit?.severity).toBe("high");
    expect(r.shadow[0].state).toBe("empty");
  });

  it("recognizes locked accounts without flagging them crackable", () => {
    const r = parseAccounts("daemon:*:19700:0:99999:7:::");
    expect(r.shadow[0].state).toBe("locked");
    expect(r.findings.some((f) => f.account === "daemon")).toBe(false);
  });

  it("detects duplicate UIDs", () => {
    const r = parseAccounts(
      "root:x:0:0:root:/root:/bin/bash\ntoor:x:0:0::/root:/bin/bash",
    );
    expect(r.findings.some((f) => /Duplicate UID 0/.test(f.message))).toBe(true);
  });

  it("ignores comments and blank lines", () => {
    const r = parseAccounts("# a comment\n\nroot:x:0:0:root:/root:/bin/bash\n");
    expect(r.passwd).toHaveLength(1);
  });

  it("errors on input with no recognizable entries", () => {
    const r = parseAccounts("this is not a passwd file");
    expect(r.error).not.toBe("");
    expect(r.passwd).toHaveLength(0);
  });

  it("returns empty for blank input", () => {
    const r = parseAccounts("   ");
    expect(r.error).toBe("");
    expect(r.findings).toHaveLength(0);
  });
});
