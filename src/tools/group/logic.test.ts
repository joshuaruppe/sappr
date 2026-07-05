import { describe, expect, it } from "vitest";
import { parseGroups } from "./logic";

describe("parseGroups", () => {
  it("parses a group line into fields", () => {
    const r = parseGroups("sudo:x:27:alice,bob");
    expect(r.groups).toHaveLength(1);
    const g = r.groups[0];
    expect(g.name).toBe("sudo");
    expect(g.gid).toBe(27);
    expect(g.members).toEqual(["alice", "bob"]);
    expect(g.privileged).toBe(true);
  });

  it("flags docker membership as high (trivial root)", () => {
    const r = parseGroups("docker:x:998:deploy");
    const hit = r.findings.find((f) => /docker/.test(f.message));
    expect(hit?.severity).toBe("high");
    expect(hit?.message).toMatch(/deploy/);
  });

  it("flags disk and shadow membership", () => {
    const r = parseGroups("disk:x:6:svc\nshadow:x:42:svc");
    expect(r.findings.filter((f) => f.severity === "high")).toHaveLength(2);
  });

  it("flags adm membership as medium", () => {
    const r = parseGroups("adm:x:4:syslog");
    const hit = r.findings.find((f) => /adm/.test(f.message));
    expect(hit?.severity).toBe("medium");
  });

  it("does not flag a privesc group with no members", () => {
    const r = parseGroups("docker:x:998:\nshadow:x:42:");
    expect(r.findings).toHaveLength(0);
  });

  it("does not flag root's own membership but flags extra members of the root group", () => {
    expect(parseGroups("root:x:0:root").findings).toHaveLength(0);
    const r = parseGroups("root:x:0:root,eviluser");
    expect(r.findings.some((f) => /eviluser/.test(f.message))).toBe(true);
  });

  it("flags a non-root group with GID 0", () => {
    const r = parseGroups("wheel2:x:0:");
    expect(r.findings.some((f) => f.severity === "high" && /GID 0/.test(f.message))).toBe(true);
  });

  it("detects duplicate GIDs", () => {
    const r = parseGroups("g1:x:100:\ng2:x:100:");
    expect(r.findings.some((f) => /Duplicate GID 100/.test(f.message))).toBe(true);
  });

  it("ignores comments and blank lines", () => {
    const r = parseGroups("# header\n\nusers:x:100:alice\n");
    expect(r.groups).toHaveLength(1);
  });

  it("errors on input with no group entries", () => {
    expect(parseGroups("not a group file").error).not.toBe("");
  });
});
