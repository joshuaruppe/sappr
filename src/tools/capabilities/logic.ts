/**
 * Decode Linux file capabilities (getcap output or a raw capability string)
 * into plain meaning and flag the ones that grant privilege escalation. Pure.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface CapItem {
  name: string;
  meaning?: string;
  severity?: Severity;
}

export interface CapEntry {
  path?: string;
  raw: string;
  /** The action/flag suffix, e.g. "+ep" or "=ep". */
  flags: string;
  /** True when the capability is effective (usable on exec). */
  effective: boolean;
  caps: CapItem[];
}

export interface CapResult {
  entries: CapEntry[];
  findings: Finding[];
  error: string;
}

const CAP_INFO: Record<string, { meaning: string; severity: Severity }> = {
  cap_setuid: { meaning: "set arbitrary UIDs - become root", severity: "high" },
  cap_setgid: { meaning: "set arbitrary GIDs", severity: "high" },
  cap_dac_override: {
    meaning: "bypass all file read/write/execute permission checks",
    severity: "high",
  },
  cap_dac_read_search: {
    meaning: "bypass file-read and directory-search checks - read any file (e.g. /etc/shadow)",
    severity: "high",
  },
  cap_sys_admin: {
    meaning: "broad admin operations (mount, etc.) - frequently root-equivalent",
    severity: "high",
  },
  cap_sys_ptrace: {
    meaning: "ptrace any process - inject into privileged processes",
    severity: "high",
  },
  cap_sys_module: {
    meaning: "load/unload kernel modules - full kernel control",
    severity: "high",
  },
  cap_setfcap: { meaning: "set file capabilities on any binary", severity: "high" },
  cap_chown: { meaning: "change ownership of any file", severity: "high" },
  cap_fowner: { meaning: "bypass ownership checks (chmod / utime / etc.)", severity: "high" },
  cap_sys_rawio: { meaning: "raw I/O-port and /dev/mem access", severity: "high" },
  cap_mac_override: {
    meaning: "override Mandatory Access Control (AppArmor / SELinux)",
    severity: "high",
  },
  cap_mac_admin: { meaning: "configure Mandatory Access Control", severity: "high" },
  cap_net_admin: {
    meaning: "configure networking (interfaces, firewall, routing)",
    severity: "high",
  },
  cap_net_raw: { meaning: "raw/packet sockets - sniff and spoof traffic", severity: "medium" },
  cap_kill: { meaning: "send signals to any process", severity: "medium" },
  cap_sys_chroot: { meaning: "chroot into arbitrary directories", severity: "medium" },
  cap_mknod: { meaning: "create device nodes - reach raw devices", severity: "medium" },
  cap_sys_time: { meaning: "set the system clock", severity: "medium" },
  cap_sys_boot: { meaning: "reboot / kexec the system", severity: "medium" },
  cap_syslog: {
    meaning: "read the kernel log; bypass kptr_restrict (KASLR leak)",
    severity: "medium",
  },
  cap_linux_immutable: {
    meaning: "set/clear immutable and append-only file attributes",
    severity: "medium",
  },
  cap_net_bind_service: { meaning: "bind to privileged ports (< 1024)", severity: "info" },
  cap_audit_write: { meaning: "write to the kernel audit log", severity: "info" },
};

const SEV_RANK: Record<Severity, number> = { high: 0, medium: 1, info: 2 };

function parseLine(line: string): CapEntry | null {
  if (!/cap_/i.test(line)) return null;

  let path: string | undefined;
  let capStr = line;
  // getcap: "<path> <caps>" or the older "<path> = <caps>".
  const m = line.match(/^(\S+)\s+=?\s*(.+)$/);
  if (m && /cap_/i.test(m[2])) {
    path = m[1];
    capStr = m[2];
  }

  const names = (capStr.match(/cap_[a-z0-9_]+/gi) ?? []).map((c) => c.toLowerCase());
  if (names.length === 0) return null;

  const flagMatch = capStr.match(/[-+=][eipEIP]+/g);
  const flags = flagMatch ? flagMatch.join("") : "";
  const effective = /e/i.test(flags) || flags === "";

  const caps: CapItem[] = names.map((name) => {
    const info = CAP_INFO[name];
    return { name, meaning: info?.meaning, severity: info?.severity };
  });

  return { path, raw: line.trim(), flags, effective, caps };
}

export function parseCapabilities(input: string): CapResult {
  const empty: CapResult = { entries: [], findings: [], error: "" };
  const text = input.trim();
  if (text === "") return empty;

  const entries: CapEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const entry = parseLine(line);
    if (entry) entries.push(entry);
  }

  if (entries.length === 0) {
    return {
      ...empty,
      error: "No capabilities found. Paste getcap output (e.g. `/usr/bin/ping cap_net_raw=ep`).",
    };
  }

  const findings: Finding[] = [];
  for (const e of entries) {
    const where = e.path ? `"${e.path}"` : "this binary";
    for (const c of e.caps) {
      if (c.severity === "high" || c.severity === "medium") {
        const inh = e.effective ? "" : " (inheritable only - not directly effective)";
        findings.push({
          severity: c.severity,
          message: `${c.name} on ${where} - ${c.meaning}${inh}.`,
        });
      }
    }
  }

  findings.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  return { entries, findings, error: "" };
}
