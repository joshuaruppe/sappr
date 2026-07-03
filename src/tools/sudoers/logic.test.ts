import { describe, expect, it } from "vitest";
import { parseSudoers } from "./logic";

describe("parseSudoers", () => {
  it("parses a basic user spec", () => {
    const r = parseSudoers("alice ALL=(ALL) /usr/bin/id");
    expect(r.rules).toHaveLength(1);
    const rule = r.rules[0];
    expect(rule.principal).toBe("alice");
    expect(rule.runas).toBe("any user");
    expect(rule.nopasswd).toBe(false);
    expect(rule.commands).toEqual(["/usr/bin/id"]);
  });

  it("flags passwordless ALL as high severity", () => {
    const r = parseSudoers("alice ALL=(ALL) NOPASSWD: ALL");
    const hit = r.findings.find((f) => f.account === "alice");
    expect(hit?.severity).toBe("high");
    expect(hit?.message).toMatch(/NO password/);
    expect(r.rules[0].nopasswd).toBe(true);
  });

  it("flags a GTFOBins command as an escalation vector", () => {
    const r = parseSudoers("bob ALL=(root) /usr/bin/find");
    expect(r.findings.some((f) => /GTFOBins/.test(f.message) && /find/.test(f.message))).toBe(true);
  });

  it("raises GTFOBins severity to high when passwordless", () => {
    const r = parseSudoers("bob ALL=(root) NOPASSWD: /usr/bin/vim");
    const hit = r.findings.find((f) => /vim/.test(f.message));
    expect(hit?.severity).toBe("high");
  });

  it("flags command wildcards", () => {
    const r = parseSudoers("deploy ALL=(root) NOPASSWD: /opt/scripts/*");
    expect(r.findings.some((f) => /Wildcard/.test(f.message))).toBe(true);
  });

  it("flags Defaults !authenticate", () => {
    const r = parseSudoers("Defaults !authenticate\nalice ALL=(ALL) ALL");
    expect(r.findings.some((f) => f.severity === "high" && /!authenticate/.test(f.message))).toBe(
      true,
    );
  });

  it("flags LD_PRELOAD env_keep", () => {
    const r = parseSudoers('Defaults env_keep += "LD_PRELOAD"\nalice ALL=(ALL) ALL');
    expect(r.findings.some((f) => /LD_PRELOAD/.test(f.message) && f.severity === "high")).toBe(true);
  });

  it("expands a Cmnd_Alias in a rule", () => {
    const r = parseSudoers(
      "Cmnd_Alias EDITORS = /usr/bin/vim, /usr/bin/nano\nbob ALL=(root) EDITORS",
    );
    expect(r.rules[0].commands).toEqual(["/usr/bin/vim", "/usr/bin/nano"]);
    expect(r.findings.filter((f) => /GTFOBins/.test(f.message))).toHaveLength(2);
  });

  it("does not flag a negated command", () => {
    const r = parseSudoers("bob ALL=(root) /usr/bin/systemctl, !/usr/bin/vim");
    expect(r.findings.some((f) => /vim/.test(f.message))).toBe(false);
  });

  it("handles line continuations", () => {
    const r = parseSudoers("alice ALL=(ALL) \\\n  NOPASSWD: /usr/bin/id");
    expect(r.rules).toHaveLength(1);
    expect(r.rules[0].nopasswd).toBe(true);
    expect(r.rules[0].commands).toEqual(["/usr/bin/id"]);
  });

  it("parses `sudo -l` output with a User header", () => {
    const r = parseSudoers(
      [
        "User alice may run the following commands on host1:",
        "    (ALL : ALL) ALL",
        "    (root) NOPASSWD: /usr/bin/vim",
      ].join("\n"),
    );
    expect(r.rules).toHaveLength(2);
    expect(r.rules[0].principal).toBe("alice");
    expect(r.rules[1].principal).toBe("alice");
    expect(r.findings.some((f) => /vim/.test(f.message) && f.severity === "high")).toBe(true);
  });

  it("errors on input with no rules", () => {
    const r = parseSudoers("just some random text");
    expect(r.error).not.toBe("");
  });
});
