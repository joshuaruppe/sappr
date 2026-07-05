import { describe, expect, it } from "vitest";
import { parseCapabilities } from "./logic";

describe("parseCapabilities", () => {
  it("parses a getcap line (space form)", () => {
    const r = parseCapabilities("/usr/bin/ping cap_net_raw=ep");
    expect(r.entries).toHaveLength(1);
    const e = r.entries[0];
    expect(e.path).toBe("/usr/bin/ping");
    expect(e.caps[0].name).toBe("cap_net_raw");
    expect(e.flags).toBe("=ep");
    expect(e.effective).toBe(true);
  });

  it("parses the older `path = caps` form", () => {
    const r = parseCapabilities("/usr/bin/foo = cap_setuid+ep");
    expect(r.entries[0].path).toBe("/usr/bin/foo");
    expect(r.entries[0].caps[0].name).toBe("cap_setuid");
  });

  it("flags cap_setuid as high (become root)", () => {
    const r = parseCapabilities("/usr/bin/python3 cap_setuid=ep");
    const hit = r.findings.find((f) => /cap_setuid/.test(f.message));
    expect(hit?.severity).toBe("high");
  });

  it("flags cap_net_raw as medium", () => {
    const r = parseCapabilities("/usr/bin/ping cap_net_raw=ep");
    expect(r.findings[0].severity).toBe("medium");
  });

  it("does not raise a finding for an info-level cap", () => {
    const r = parseCapabilities("/usr/bin/svc cap_net_bind_service=ep");
    expect(r.findings).toHaveLength(0);
    expect(r.entries[0].caps[0].meaning).toMatch(/privileged ports/);
  });

  it("handles multiple comma-separated caps", () => {
    const r = parseCapabilities("/usr/bin/foo cap_setuid,cap_setgid+ep");
    expect(r.entries[0].caps.map((c) => c.name)).toEqual(["cap_setuid", "cap_setgid"]);
    expect(r.findings).toHaveLength(2);
  });

  it("notes inheritable-only caps as not directly effective", () => {
    const r = parseCapabilities("/usr/bin/foo cap_setuid+i");
    expect(r.entries[0].effective).toBe(false);
    expect(r.findings[0].message).toMatch(/inheritable only/);
  });

  it("accepts a bare capability string with no path", () => {
    const r = parseCapabilities("cap_dac_read_search+ep");
    expect(r.entries[0].path).toBeUndefined();
    expect(r.findings[0].severity).toBe("high");
  });

  it("errors when no capabilities are present", () => {
    expect(parseCapabilities("just some text").error).not.toBe("");
  });
});
