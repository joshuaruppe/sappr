/**
 * Parse Linux/Unix /etc/passwd and /etc/shadow into structured accounts and
 * surface post-exploitation red flags: UID 0 accounts, empty or unshadowed
 * passwords, weak hash schemes and duplicate UIDs. Pure — no DOM.
 *
 * Paste either file, or both at once; each line is classified by its shape.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  /** Account the finding is about, if any. */
  account?: string;
  message: string;
}

export interface PasswdEntry {
  name: string;
  /** Field 2: usually "x" (shadowed), "*"/"!" (locked), or an inline hash. */
  password: string;
  uid: number;
  gid: number;
  gecos: string;
  home: string;
  shell: string;
  /** True when the shell is a real login shell (not nologin/false). */
  loginShell: boolean;
}

export type ShadowState = "active" | "locked" | "empty" | "unset" | "unknown";

export interface ShadowEntry {
  name: string;
  /** Human label for the crypt scheme or state. */
  scheme: string;
  state: ShadowState;
  weak: boolean;
  /** Days since epoch of last change, or "" if unset. */
  lastChange: string;
  /** Days since epoch when the account expires, or "" if none. */
  expire: string;
}

export interface AccountsResult {
  passwd: PasswdEntry[];
  shadow: ShadowEntry[];
  findings: Finding[];
  error: string;
}

/** crypt(3) id prefixes, longest-first so "$2b$" wins over "$2$". */
const CRYPT_SCHEMES: { prefix: string; label: string; weak?: boolean }[] = [
  { prefix: "$gy$", label: "gost-yescrypt" },
  { prefix: "$y$", label: "yescrypt" },
  { prefix: "$7$", label: "scrypt" },
  { prefix: "$2b$", label: "bcrypt" },
  { prefix: "$2y$", label: "bcrypt" },
  { prefix: "$2a$", label: "bcrypt" },
  { prefix: "$2$", label: "bcrypt" },
  { prefix: "$6$", label: "sha512crypt" },
  { prefix: "$5$", label: "sha256crypt" },
  { prefix: "$md5$", label: "Sun md5crypt", weak: true },
  { prefix: "$1$", label: "md5crypt", weak: true },
];

const NOLOGIN_SHELLS = new Set([
  "",
  "/usr/sbin/nologin",
  "/sbin/nologin",
  "/usr/bin/nologin",
  "/bin/false",
  "/usr/bin/false",
  "/bin/true",
  "/usr/bin/true",
  "/dev/null",
]);

function looksLikeHash(field: string): boolean {
  if (field.startsWith("$")) return true;
  // Classic DES crypt: exactly 13 chars from the crypt alphabet, no separators.
  return /^[./0-9A-Za-z]{13}$/.test(field);
}

/** Classify a shadow password field into a scheme label + state. */
function classifyShadow(hash: string): { scheme: string; state: ShadowState; weak: boolean } {
  if (hash === "") return { scheme: "empty (no password)", state: "empty", weak: false };
  if (/^[!*]+$/.test(hash)) return { scheme: "locked", state: "locked", weak: false };

  // "!$6$..." — locked, but a crackable hash is still present.
  const bare = hash.replace(/^!/, "");
  const locked = bare !== hash;

  for (const s of CRYPT_SCHEMES) {
    if (bare.startsWith(s.prefix)) {
      return {
        scheme: locked ? `locked (${s.label} hash present)` : s.label,
        state: locked ? "locked" : "active",
        weak: s.weak ?? false,
      };
    }
  }
  if (/^[./0-9A-Za-z]{13}$/.test(bare)) {
    return {
      scheme: locked ? "locked (descrypt hash present)" : "descrypt",
      state: locked ? "locked" : "active",
      weak: true,
    };
  }
  return { scheme: "unknown", state: "unknown", weak: false };
}

const SEV_RANK: Record<Severity, number> = { high: 0, medium: 1, info: 2 };

/** Parse pasted /etc/passwd and/or /etc/shadow text. */
export function parseAccounts(input: string): AccountsResult {
  const empty: AccountsResult = { passwd: [], shadow: [], findings: [], error: "" };
  const text = input.trim();
  if (text === "") return empty;

  const passwd: PasswdEntry[] = [];
  const shadow: ShadowEntry[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const parts = line.split(":");

    // passwd: exactly 7 fields, with numeric uid/gid.
    if (parts.length === 7 && /^\d+$/.test(parts[2]) && /^\d+$/.test(parts[3])) {
      const shell = parts[6];
      passwd.push({
        name: parts[0],
        password: parts[1],
        uid: parseInt(parts[2], 10),
        gid: parseInt(parts[3], 10),
        gecos: parts[4],
        home: parts[5],
        shell,
        loginShell: !NOLOGIN_SHELLS.has(shell),
      });
      continue;
    }

    // shadow: 8+ colon-separated fields (name:hash:aging...).
    if (parts.length >= 8) {
      const { scheme, state, weak } = classifyShadow(parts[1]);
      shadow.push({
        name: parts[0],
        scheme,
        state,
        weak,
        lastChange: parts[2] ?? "",
        expire: parts[7] ?? "",
      });
      continue;
    }
    // Anything else is ignored (partial paste, headers, etc.).
  }

  if (passwd.length === 0 && shadow.length === 0) {
    return {
      ...empty,
      error:
        "No passwd or shadow entries found. Paste /etc/passwd (name:x:uid:gid:…) or /etc/shadow (name:hash:…) lines.",
    };
  }

  const findings: Finding[] = [];

  // --- passwd findings ---
  const uidCounts = new Map<number, string[]>();
  for (const e of passwd) {
    uidCounts.set(e.uid, [...(uidCounts.get(e.uid) ?? []), e.name]);

    if (e.uid === 0 && e.name !== "root") {
      findings.push({
        severity: "high",
        account: e.name,
        message: `UID 0 — root-equivalent account "${e.name}".`,
      });
    }
    if (e.password === "") {
      findings.push({
        severity: "high",
        account: e.name,
        message: `Empty password field in /etc/passwd for "${e.name}" — login with no password.`,
      });
    } else if (looksLikeHash(e.password)) {
      findings.push({
        severity: "high",
        account: e.name,
        message: `Password hash stored directly in /etc/passwd for "${e.name}" (not shadowed).`,
      });
    }
    if (e.loginShell && e.uid !== 0 && e.uid < 1000) {
      findings.push({
        severity: "medium",
        account: e.name,
        message: `System account "${e.name}" (uid ${e.uid}) has a login shell (${e.shell}).`,
      });
    }
  }
  for (const [uid, names] of uidCounts) {
    if (names.length > 1) {
      findings.push({
        severity: "medium",
        message: `Duplicate UID ${uid} shared by: ${names.join(", ")}.`,
      });
    }
  }

  // --- shadow findings ---
  for (const s of shadow) {
    if (s.state === "empty") {
      findings.push({
        severity: "high",
        account: s.name,
        message: `"${s.name}" has an empty password in /etc/shadow — passwordless login.`,
      });
    } else if (s.state === "active") {
      if (s.weak) {
        findings.push({
          severity: "medium",
          account: s.name,
          message: `"${s.name}" uses a weak hash scheme (${s.scheme}) — fast to crack.`,
        });
      } else {
        findings.push({
          severity: "info",
          account: s.name,
          message: `"${s.name}" has a crackable ${s.scheme} hash.`,
        });
      }
    }
  }

  findings.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  return { passwd, shadow, findings, error: "" };
}
