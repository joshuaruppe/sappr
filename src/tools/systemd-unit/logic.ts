/**
 * Analyze a systemd unit (.service) for persistence and privilege-escalation red
 * flags: a root service running a user-writable / relative ExecStart, a "+"/"!"
 * prefix that bypasses User=, secrets in Environment=, and missing sandboxing.
 * Pure - no DOM.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface Directive {
  section: string;
  key: string;
  value: string;
}

export interface SystemdResult {
  directives: Directive[];
  findings: Finding[];
  error: string;
}

const WRITABLE_DIRS = ["/home/", "/tmp/", "/var/tmp/", "/dev/shm/"];
const SECRET_RE = /(pass|secret|token|api[_-]?key|cred|private[_-]?key)/i;
const HARDENING = [
  "NoNewPrivileges",
  "ProtectSystem",
  "ProtectHome",
  "PrivateTmp",
  "PrivateDevices",
  "ProtectKernelModules",
  "RestrictNamespaces",
  "CapabilityBoundingSet",
  "DynamicUser",
];

const SEV_RANK: Record<Severity, number> = { high: 0, medium: 1, info: 2 };

/** Join `\`-continued lines. */
function logicalLines(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (const raw of text.split(/\r?\n/)) {
    buf = buf ? `${buf} ${raw.trim()}` : raw;
    if (buf.trimEnd().endsWith("\\")) {
      buf = buf.trimEnd().slice(0, -1);
    } else {
      out.push(buf);
      buf = "";
    }
  }
  if (buf) out.push(buf);
  return out;
}

function stripExecPrefix(cmd: string): { prefix: string; rest: string } {
  const m = cmd.match(/^([-@+!:]+)\s*(.*)$/);
  return m ? { prefix: m[1], rest: m[2].trim() } : { prefix: "", rest: cmd };
}

function isHardened(v: string | undefined): boolean {
  return !!v && !/^(false|no|0|off)$/i.test(v.trim());
}

export function parseSystemdUnit(input: string): SystemdResult {
  const empty: SystemdResult = { directives: [], findings: [], error: "" };
  const text = input.trim();
  if (text === "") return empty;

  const directives: Directive[] = [];
  const service: Record<string, string[]> = {};
  let section = "";

  for (const line of logicalLines(text)) {
    const t = line.trim();
    if (t === "" || t.startsWith("#") || t.startsWith(";")) continue;
    const sec = t.match(/^\[(.+)\]$/);
    if (sec) {
      section = sec[1];
      continue;
    }
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const value = t.slice(eq + 1).trim();
    directives.push({ section, key, value });
    if (section === "Service") {
      service[key] = [...(service[key] ?? []), value];
    }
  }

  if (directives.length === 0) {
    return { ...empty, error: "No unit directives found. Paste a systemd unit file (e.g. a .service)." };
  }

  const findings: Finding[] = [];
  const userVals = service["User"] ?? [];
  const user = userVals[userVals.length - 1];
  const userIsRoot = !user || user === "root" || user === "0";
  const who = userIsRoot ? "root service" : `service (User=${user})`;

  const execs = [
    ...(service["ExecStart"] ?? []),
    ...(service["ExecStartPre"] ?? []),
    ...(service["ExecStartPost"] ?? []),
  ];
  for (const rawExec of execs) {
    const { prefix, rest } = stripExecPrefix(rawExec);
    const bin = rest.split(/\s+/)[0] ?? "";
    if (!bin) continue;

    if (WRITABLE_DIRS.some((d) => rest.includes(d))) {
      findings.push({
        severity: "high",
        message: `${who} ExecStart runs from a user-writable path: ${bin}`,
      });
    } else if (!bin.startsWith("/")) {
      findings.push({
        severity: "medium",
        message: `Relative ExecStart "${bin}" - resolved via PATH, hijackable if an earlier PATH entry is writable.`,
      });
    }
    if (/\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|da|z)?sh\b/.test(rest)) {
      findings.push({ severity: "high", message: `ExecStart downloads and pipes to a shell: ${rest}` });
    }
    if (!userIsRoot && /[+!]/.test(prefix)) {
      findings.push({
        severity: "high",
        message: `ExecStart "${prefix}" prefix runs as root, bypassing User=${user}.`,
      });
    }
  }

  for (const key of ["Environment", "EnvironmentFile"]) {
    for (const v of service[key] ?? []) {
      if (SECRET_RE.test(v)) {
        findings.push({ severity: "medium", message: `Possible secret in ${key}=: ${v}` });
      }
    }
  }

  if (userIsRoot) {
    const hardened = HARDENING.some((h) => isHardened(service[h]?.at(-1)));
    if (!hardened) {
      findings.push({
        severity: "info",
        message: "Runs as root with no sandboxing (NoNewPrivileges / ProtectSystem / …).",
      });
    }
  }

  findings.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  return { directives, findings, error: "" };
}
