import { describe, expect, it } from "vitest";
import { parseMode, parseListing } from "./logic";

describe("parseMode", () => {
  it("decodes a plain octal mode", () => {
    const { mode } = parseMode("755");
    expect(mode?.octal).toBe("0755");
    expect(mode?.symbolic).toBe("rwxr-xr-x");
    expect(mode?.owner).toEqual({ read: true, write: true, execute: true });
    expect(mode?.other).toEqual({ read: true, write: false, execute: true });
  });

  it("decodes special bits from a 4-digit octal", () => {
    const { mode } = parseMode("4755");
    expect(mode?.setuid).toBe(true);
    expect(mode?.symbolic).toBe("rwsr-xr-x");
  });

  it("shows a capital S for setuid without execute", () => {
    const { mode } = parseMode("4644");
    expect(mode?.symbolic).toBe("rwSr--r--");
  });

  it("round-trips symbolic back to octal", () => {
    const { mode } = parseMode("rwxr-xr-x");
    expect(mode?.octal).toBe("0755");
  });

  it("parses an ls-style symbolic string with a type char", () => {
    const { mode } = parseMode("-rwsr-xr-x");
    expect(mode?.octal).toBe("4755");
    expect(mode?.setuid).toBe(true);
  });

  it("decodes the sticky bit", () => {
    const { mode } = parseMode("1777");
    expect(mode?.sticky).toBe(true);
    expect(mode?.symbolic).toBe("rwxrwxrwt");
  });

  it("flags a world-writable setuid file as high severity", () => {
    const { findings } = parseMode("4757");
    expect(findings.some((f) => f.severity === "high")).toBe(true);
  });

  it("flags a setuid binary as an escalation target", () => {
    const { findings } = parseMode("4755");
    expect(findings.some((f) => f.severity === "medium" && /setuid/.test(f.message))).toBe(true);
  });

  it("flags world-writable files", () => {
    const { findings } = parseMode("777");
    expect(findings.some((f) => /World-writable/.test(f.message))).toBe(true);
  });

  it("errors on nonsense input", () => {
    expect(parseMode("banana").error).not.toBe("");
    expect(parseMode("999").error).not.toBe("");
  });
});

describe("parseListing", () => {
  it("parses a basic ls -l line", () => {
    const r = parseListing("drwxr-xr-x 100 root root 4096 Jun 23 17:37 etc");
    expect(r.entries).toHaveLength(1);
    const e = r.entries[0];
    expect(e.type).toBe("d");
    expect(e.typeLabel).toBe("directory");
    expect(e.name).toBe("etc");
    expect(e.owner).toBe("root");
    expect(e.mode.octal).toBe("0755");
  });

  it("tolerates the leading ls -s block column and the total header", () => {
    const r = parseListing("total 16164\n16132 -rw-r--r-- 1 root root 16517243 Oct 20 2024 ffmpeg.tar.gz");
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].name).toBe("ffmpeg.tar.gz");
    expect(r.entries[0].mode.octal).toBe("0644");
  });

  it("extracts a symlink target and never flags symlink perms", () => {
    const r = parseListing("lrwxrwxrwx 1 root root 7 Jul 16 2025 bin -> usr/bin");
    expect(r.entries[0].type).toBe("l");
    expect(r.entries[0].name).toBe("bin");
    expect(r.entries[0].target).toBe("usr/bin");
    expect(r.findings).toHaveLength(0);
  });

  it("flags a world-writable file as high", () => {
    const r = parseListing("-rw-rw-rw- 1 root root 220 Jul 3 06:51 world.conf");
    expect(r.findings.some((f) => f.severity === "high" && /world-writable/i.test(f.message))).toBe(
      true,
    );
  });

  it("treats a world-writable sticky dir (/tmp) as info, not high", () => {
    const r = parseListing("drwxrwxrwt 12 root root 4096 Jul 3 06:51 tmp");
    expect(r.findings.some((f) => f.severity === "high")).toBe(false);
    expect(r.findings.some((f) => f.severity === "info" && /sticky/.test(f.message))).toBe(true);
  });

  it("flags a setuid binary", () => {
    const r = parseListing("-rwsr-xr-x 1 root root 68208 Mar 23 2024 sudo");
    const hit = r.findings.find((f) => /setuid/.test(f.message));
    expect(hit?.severity).toBe("medium");
    expect(r.entries[0].mode.setuid).toBe(true);
  });

  it("parses a multi-line listing and aggregates concerns", () => {
    const r = parseListing(
      [
        "drwxr-xr-x 2 root root 4096 Jul 16 2025 etc",
        "-rwsr-xr-x 1 root root 68208 Mar 23 2024 sudo",
        "-rw-rw-rw- 1 root root 220 Jul 3 06:51 world.conf",
      ].join("\n"),
    );
    expect(r.entries).toHaveLength(3);
    // High (world-writable) sorts before medium (setuid).
    expect(r.findings[0].severity).toBe("high");
  });

  it("handles ACL/SELinux mode markers (trailing . or +)", () => {
    const r = parseListing("drwxr-xr-x. 2 root root 4096 Jul 16 2025 etc");
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].mode.octal).toBe("0755");
  });

  it("errors when nothing parses", () => {
    expect(parseListing("just some prose here").error).not.toBe("");
  });
});
