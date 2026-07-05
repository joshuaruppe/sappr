/**
 * Parse /etc/group and flag membership in privilege-escalation groups (docker,
 * lxd, disk, shadow ≈ instant root; sudo/wheel/adm and friends). Pure — no DOM.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface GroupEntry {
  name: string;
  password: string;
  gid: number;
  members: string[];
  /** True if this group grants a known privesc path. */
  privileged: boolean;
}

export interface GroupResult {
  groups: GroupEntry[];
  findings: Finding[];
  error: string;
}

/** Groups whose members get a known privilege-escalation path. */
const PRIVESC_GROUPS: Record<string, { severity: Severity; reason: string }> = {
  sudo: { severity: "high", reason: "can run commands as root via sudo" },
  wheel: { severity: "high", reason: "can run commands as root via sudo" },
  admin: { severity: "high", reason: "can run commands as root via sudo (Debian/Ubuntu)" },
  root: { severity: "high", reason: "are in the root group" },
  docker: {
    severity: "high",
    reason: "can mount the host filesystem into a container — trivial root",
  },
  lxd: { severity: "high", reason: "can launch a privileged container — trivial root" },
  lxc: { severity: "high", reason: "can launch a privileged container — trivial root" },
  disk: {
    severity: "high",
    reason: "have raw block-device access — can read/modify any file (e.g. /etc/shadow)",
  },
  shadow: {
    severity: "high",
    reason: "can read /etc/shadow (offline-crackable password hashes)",
  },
  video: { severity: "info", reason: "can read framebuffer/GPU memory" },
  adm: { severity: "medium", reason: "can read most system logs" },
  staff: {
    severity: "medium",
    reason: "can write under /usr/local — PATH-hijack root binaries/cron",
  },
  libvirt: { severity: "medium", reason: "can manage VMs and reach the host" },
  kvm: { severity: "info", reason: "can use hardware virtualization" },
  wireshark: { severity: "medium", reason: "can capture network traffic (credentials)" },
  netdev: { severity: "info", reason: "can manage network interfaces" },
};

const SEV_RANK: Record<Severity, number> = { high: 0, medium: 1, info: 2 };

/** Parse pasted /etc/group text. */
export function parseGroups(input: string): GroupResult {
  const empty: GroupResult = { groups: [], findings: [], error: "" };
  const text = input.trim();
  if (text === "") return empty;

  const groups: GroupEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const parts = line.split(":");
    // name:password:gid:member,member,…
    if (parts.length < 3 || !/^\d+$/.test(parts[2])) continue;
    const members = (parts[3] ?? "")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    groups.push({
      name: parts[0],
      password: parts[1],
      gid: parseInt(parts[2], 10),
      members,
      privileged: parts[0] in PRIVESC_GROUPS,
    });
  }

  if (groups.length === 0) {
    return {
      ...empty,
      error: "No group entries found. Paste /etc/group lines (name:x:gid:member,member,…).",
    };
  }

  const findings: Finding[] = [];
  const gidCounts = new Map<number, string[]>();

  for (const g of groups) {
    gidCounts.set(g.gid, [...(gidCounts.get(g.gid) ?? []), g.name]);

    const info = PRIVESC_GROUPS[g.name];
    // The root group (gid 0) only matters when non-root members are added.
    const relevantMembers = g.name === "root" ? g.members.filter((m) => m !== "root") : g.members;
    if (info && relevantMembers.length > 0) {
      findings.push({
        severity: info.severity,
        message: `Members of "${g.name}" ${info.reason}: ${relevantMembers.join(", ")}.`,
      });
    }

    if (g.gid === 0 && g.name !== "root") {
      findings.push({
        severity: "high",
        message: `Group "${g.name}" has GID 0 (root group).`,
      });
    }
    if (g.password && g.password !== "x" && g.password !== "*" && g.password !== "!") {
      findings.push({
        severity: "info",
        message: `Group "${g.name}" has a group password set.`,
      });
    }
  }

  for (const [gid, names] of gidCounts) {
    if (names.length > 1) {
      findings.push({ severity: "medium", message: `Duplicate GID ${gid}: ${names.join(", ")}.` });
    }
  }

  findings.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  return { groups, findings, error: "" };
}
