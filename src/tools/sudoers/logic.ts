/**
 * Parse a sudoers file and surface privilege-escalation red flags: passwordless
 * ALL rules, wildcard commands, environment-preservation tricks, and commands
 * that are known GTFOBins shell-out vectors. Pure - no DOM.
 *
 * This is a pragmatic line parser for triage, not a full sudoers grammar. It
 * covers the common user-spec and Defaults forms you meet on real hosts.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  account?: string;
  message: string;
}

export interface SudoRule {
  principal: string;
  host: string;
  /** Human label for the run-as target ("root", "any user", "postgres"…). */
  runas: string;
  nopasswd: boolean;
  setenv: boolean;
  commands: string[];
  raw: string;
}

export interface SudoersResult {
  rules: SudoRule[];
  findings: Finding[];
  error: string;
}

/** A curated subset of GTFOBins binaries that grant a shell / command exec when
 * runnable via sudo. Not exhaustive - enough to catch the usual suspects. */
const GTFOBINS = new Set([
  "vi", "vim", "vimdiff", "view", "rvim", "nano", "pico", "less", "more", "most",
  "man", "awk", "gawk", "mawk", "find", "env", "python", "python2", "python3",
  "perl", "ruby", "lua", "node", "php", "nmap", "tar", "cpio", "zip", "git",
  "tcpdump", "ftp", "gdb", "make", "nice", "ionice", "sed", "ed", "emacs",
  "socat", "bash", "sh", "dash", "zsh", "ksh", "csh", "fish", "screen", "tmux",
  "expect", "xargs", "flock", "busybox", "docker", "journalctl", "systemctl",
  "apt", "apt-get", "dpkg", "pip", "openssl", "strace", "ltrace", "crontab",
  "at", "mount", "rsync", "scp", "wget", "curl", "gcc", "cc", "start-stop-daemon",
]);

const TAGS = new Set([
  "NOPASSWD", "PASSWD", "NOEXEC", "EXEC", "SETENV", "NOSETENV", "LOG_INPUT",
  "NOLOG_INPUT", "LOG_OUTPUT", "NOLOG_OUTPUT", "MAIL", "NOMAIL", "FOLLOW",
  "NOFOLLOW", "INTERCEPT", "NOINTERCEPT",
]);

const SEV_RANK: Record<Severity, number> = { high: 0, medium: 1, info: 2 };

/** Join sudoers line continuations (a trailing "\" continues onto the next line). */
function logicalLines(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (const raw of text.split(/\r?\n/)) {
    if (buf) {
      buf += " " + raw.trim();
    } else {
      buf = raw;
    }
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

function commandBasename(cmd: string): string {
  const first = cmd.trim().split(/\s+/)[0] ?? "";
  return first.split("/").pop() ?? first;
}

function runasLabel(spec: string): string {
  const inner = spec.trim();
  if (inner === "") return "root";
  if (/\bALL\b/.test(inner)) return "any user";
  return inner.split(":")[0].trim() || "root";
}

export function parseSudoers(input: string): SudoersResult {
  const empty: SudoersResult = { rules: [], findings: [], error: "" };
  const text = input.trim();
  if (text === "") return empty;

  const cmndAliases = new Map<string, string[]>();
  const rules: SudoRule[] = [];
  const findings: Finding[] = [];
  // Tracks the subject of a `sudo -l` block ("User alice may run …").
  let currentUser = "current user";

  // First pass: collect Cmnd_Alias definitions so rules can expand them.
  for (const line of logicalLines(text)) {
    const m = line.trim().match(/^Cmnd_Alias\s+([A-Z0-9_]+)\s*=\s*(.+)$/);
    if (m) cmndAliases.set(m[1], m[2].split(",").map((c) => c.trim()));
  }

  for (const rawLine of logicalLines(text)) {
    const line = rawLine.trim();
    if (line === "") continue;

    if (line.startsWith("#")) {
      if (/^#\s*include/i.test(line)) {
        findings.push({ severity: "info", message: `Includes external rules: ${line}` });
      }
      continue;
    }

    if (/^Defaults\b/i.test(line)) {
      if (/!authenticate\b/.test(line)) {
        findings.push({
          severity: "high",
          message: "Authentication disabled (Defaults !authenticate) - sudo runs without a password.",
        });
      }
      if (/env_keep\b/.test(line) && /LD_PRELOAD|LD_LIBRARY_PATH/.test(line)) {
        findings.push({
          severity: "high",
          message: "Defaults env_keep preserves LD_PRELOAD/LD_LIBRARY_PATH - library injection into sudo commands.",
        });
      }
      if (/\b(targetpw|rootpw|runaspw)\b/.test(line)) {
        findings.push({ severity: "info", message: `Password prompt uses a different account: ${line.trim()}` });
      }
      continue;
    }

    // Alias definitions are consumed above / not rules themselves.
    if (/^(User|Runas|Host|Cmnd)_Alias\b/.test(line)) continue;

    // `sudo -l` header line: "User alice may run the following commands on host:".
    const userHeader = line.match(/^User\s+(\S+)\s+may run/i);
    if (userHeader) {
      currentUser = userHeader[1];
      continue;
    }

    let principal: string;
    let host: string;
    let right: string;

    if (/^\(/.test(line)) {
      // `sudo -l` entry: "(runas) TAGS: commands" with no "who host =" prefix.
      principal = currentUser;
      host = "";
      right = line;
    } else {
      // sudoers user spec: `who host = (runas) TAGS: commands`.
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const left = line.slice(0, eq).trim();
      right = line.slice(eq + 1).trim();
      const leftTokens = left.split(/\s+/);
      principal = leftTokens[0] ?? "";
      host = leftTokens.slice(1).join(" ") || "ALL";
    }

    // Pull the (runas) spec, if present.
    let runas = "";
    const runasMatch = right.match(/\(([^)]*)\)/);
    if (runasMatch) {
      runas = runasMatch[1];
      right = right.replace(runasMatch[0], " ");
    }

    // Pull leading tags (NOPASSWD:, SETENV:, …).
    let nopasswd = false;
    let setenv = false;
    const tokens = right.split(/\s+/).filter(Boolean);
    const cmdTokens: string[] = [];
    for (const tok of tokens) {
      const tagName = tok.endsWith(":") ? tok.slice(0, -1) : "";
      if (tagName && TAGS.has(tagName)) {
        if (tagName === "NOPASSWD") nopasswd = true;
        if (tagName === "SETENV") setenv = true;
        continue;
      }
      cmdTokens.push(tok);
    }

    // Rejoin and split the command list on commas, expanding Cmnd_Aliases.
    const commandList = cmdTokens
      .join(" ")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .flatMap((c) => cmndAliases.get(c) ?? [c]);

    const label = runasLabel(runas);
    const rule: SudoRule = {
      principal,
      host,
      runas: label,
      nopasswd,
      setenv,
      commands: commandList,
      raw: line,
    };
    rules.push(rule);

    // --- findings for this rule ---
    const grantsAll = commandList.some((c) => c.replace(/^!/, "").trim() === "ALL");
    if (grantsAll) {
      findings.push({
        severity: nopasswd ? "high" : "medium",
        account: principal,
        message: nopasswd
          ? `"${principal}" can run ANY command as ${label} with NO password.`
          : `"${principal}" can run any command as ${label}.`,
      });
    }

    for (const cmd of commandList) {
      if (cmd.startsWith("!")) continue; // a negation, not a grant
      const bn = commandBasename(cmd);
      if (bn !== "ALL" && GTFOBINS.has(bn)) {
        findings.push({
          severity: nopasswd ? "high" : "medium",
          account: principal,
          message: `"${principal}" may run ${bn} as ${label}${nopasswd ? " without a password" : ""} - known GTFOBins escalation vector.`,
        });
      }
      if (cmd.includes("*")) {
        findings.push({
          severity: "medium",
          account: principal,
          message: `Wildcard in "${cmd}" for "${principal}" - argument-injection risk.`,
        });
      }
    }

    if (setenv) {
      findings.push({
        severity: "info",
        account: principal,
        message: `SETENV lets "${principal}" pass environment variables into the command (e.g. LD_PRELOAD).`,
      });
    }
  }

  if (rules.length === 0 && findings.length === 0) {
    return {
      ...empty,
      error:
        "No sudoers rules found. Paste a sudoers file (e.g. the output of `sudo cat /etc/sudoers` or `sudo -l`).",
    };
  }

  findings.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  return { rules, findings, error: "" };
}
