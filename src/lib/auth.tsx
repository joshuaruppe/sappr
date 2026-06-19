/**
 * Client-side password gate for sappr (1.0, browser-only).
 *
 * THREAT MODEL — read before relying on this. In a browser-only build this is
 * a *deterrent*, not a cryptographic access boundary: anyone with devtools or
 * filesystem access to the machine can clear the unlock marker and bypass the
 * gate, and sappr keeps no sensitive data at rest to encrypt. What it DOES
 * guarantee is that the password is never stored in a recoverable form — only
 * an Argon2id hash (random salt, memory-hard params) lives in localStorage, so
 * reading the stored record cannot reveal the password or enable its reuse.
 *
 * For a real team/company gate on a self-hosted instance, enforce at the server
 * (reverse-proxy basic auth / SSO) — this layer is the convenience front-end to
 * that, and becomes server-backed in 2.0.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { argon2id, argon2Verify } from "hash-wasm";

const RECORD_KEY = "sappr.auth";
const EXPIRY_KEY = "sappr.auth.until"; // localStorage: ms timestamp the unlock is valid until (daily/weekly)
const SESSION_KEY = "sappr.auth.session"; // sessionStorage: present => unlocked this launch (launch mode)

/** Minimum password length accepted when enabling protection. */
export const MIN_PASSWORD_LENGTH = 10;

/** A single password-policy rule with a human label and its test. */
export interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

/**
 * Password policy for enabling/changing protection. A light barrier (this is a
 * client-side deterrent, see the threat model above) — but enough to stop weak
 * shared secrets. The UI surfaces each unmet rule live.
 */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    test: (pw) => pw.length >= MIN_PASSWORD_LENGTH,
  },
  { label: "An uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "A number", test: (pw) => /[0-9]/.test(pw) },
  { label: "A special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

/** The labels of every rule the password fails (empty array => valid). */
export function passwordIssues(pw: string): string[] {
  return PASSWORD_RULES.filter((r) => !r.test(pw)).map((r) => r.label);
}

/** Whether the password satisfies every policy rule. */
export function isPasswordValid(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw));
}

/** How often the user is re-prompted for the password. */
export type LockInterval = "launch" | "daily" | "weekly";

export const LOCK_INTERVALS: { value: LockInterval; label: string }[] = [
  { value: "launch", label: "Every launch" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

/** Milliseconds an unlock stays valid; 0 = session-scoped (re-prompt every launch). */
const PERSIST_MS: Record<LockInterval, number> = {
  launch: 0,
  daily: 86_400_000,
  weekly: 604_800_000,
};

/**
 * Argon2id parameters. Tuned for an infrequent unlock (≤ once per launch):
 * memory-hard enough to make the stored hash expensive to attack offline, yet
 * well under ~1s on typical self-host hardware.
 */
const ARGON2 = {
  parallelism: 1,
  iterations: 3,
  memorySize: 65_536, // KiB => 64 MiB
  hashLength: 32,
} as const;

export interface AuthRecord {
  /** Schema version. */
  v: 1;
  /** Argon2id PHC-encoded hash — embeds the random salt and params. */
  hash: string;
  /** How often to re-prompt. */
  interval: LockInterval;
}

// --- storage helpers (guarded so auth logic never throws in non-DOM tests) --

function ls(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function ss(): Storage | null {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
}

// --- password hashing -------------------------------------------------------

/** Hash a password with Argon2id and a fresh random 16-byte salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return argon2id({ password, salt, ...ARGON2, outputType: "encoded" });
}

/** Verify a password against a stored Argon2id PHC hash (constant-time in wasm). */
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash: encoded });
  } catch {
    return false;
  }
}

// --- record persistence -----------------------------------------------------

export function loadRecord(): AuthRecord | null {
  const store = ls();
  if (!store) return null;
  try {
    const raw = store.getItem(RECORD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthRecord>;
    if (parsed && parsed.v === 1 && typeof parsed.hash === "string") {
      const interval: LockInterval =
        parsed.interval === "launch" ||
        parsed.interval === "daily" ||
        parsed.interval === "weekly"
          ? parsed.interval
          : "daily";
      return { v: 1, hash: parsed.hash, interval };
    }
  } catch {
    /* corrupt record => treated as no protection */
  }
  return null;
}

export function saveRecord(rec: AuthRecord): void {
  ls()?.setItem(RECORD_KEY, JSON.stringify(rec));
}

export function clearRecord(): void {
  ls()?.removeItem(RECORD_KEY);
  clearUnlock();
}

// --- unlock state -----------------------------------------------------------

/** Expiry timestamp for a freshly granted unlock (0 = session-scoped). */
export function unlockExpiry(interval: LockInterval, now: number): number {
  const ms = PERSIST_MS[interval];
  return ms > 0 ? now + ms : 0;
}

/** Is the app currently unlocked for this record? */
export function isUnlocked(rec: AuthRecord, now: number = Date.now()): boolean {
  if (rec.interval === "launch") {
    return ss()?.getItem(SESSION_KEY) === "1";
  }
  const raw = ls()?.getItem(EXPIRY_KEY);
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && now < until;
}

/** Record that the user just unlocked successfully. */
export function markUnlocked(rec: AuthRecord, now: number = Date.now()): void {
  if (rec.interval === "launch") {
    ss()?.setItem(SESSION_KEY, "1");
    ls()?.removeItem(EXPIRY_KEY);
    return;
  }
  ls()?.setItem(EXPIRY_KEY, String(unlockExpiry(rec.interval, now)));
  ss()?.removeItem(SESSION_KEY);
}

/** Forget any active unlock (re-locks now / on next load). */
export function clearUnlock(): void {
  ls()?.removeItem(EXPIRY_KEY);
  ss()?.removeItem(SESSION_KEY);
}

// --- React context ----------------------------------------------------------

interface AuthContextValue {
  /** Whether password protection is currently enabled. */
  enabled: boolean;
  /** Whether the gate is currently showing (enabled && not unlocked). */
  locked: boolean;
  /** Re-prompt cadence (only meaningful when enabled). */
  interval: LockInterval;
  /** Attempt to unlock with a password. Resolves true on success. */
  unlock: (password: string) => Promise<boolean>;
  /** Enable protection with a new password + cadence. */
  enable: (password: string, interval: LockInterval) => Promise<void>;
  /** Disable protection. Requires the current password; false if wrong. */
  disable: (currentPassword: string) => Promise<boolean>;
  /** Change the password. Requires the current one; false if wrong. */
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<boolean>;
  /** Change the re-prompt cadence. */
  setInterval: (interval: LockInterval) => void;
  /** Lock immediately. */
  lock: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [record, setRecord] = useState<AuthRecord | null>(loadRecord);
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    const r = loadRecord();
    return r ? isUnlocked(r) : true;
  });

  const unlock = useCallback(
    async (password: string) => {
      if (!record) return true;
      const ok = await verifyPassword(password, record.hash);
      if (ok) {
        markUnlocked(record);
        setUnlocked(true);
      }
      return ok;
    },
    [record],
  );

  const enable = useCallback(
    async (password: string, interval: LockInterval) => {
      const hash = await hashPassword(password);
      const rec: AuthRecord = { v: 1, hash, interval };
      saveRecord(rec);
      markUnlocked(rec); // the person enabling it is already unlocked
      setRecord(rec);
      setUnlocked(true);
    },
    [],
  );

  const disable = useCallback(
    async (currentPassword: string) => {
      if (!record) return true;
      const ok = await verifyPassword(currentPassword, record.hash);
      if (!ok) return false;
      clearRecord();
      setRecord(null);
      setUnlocked(true);
      return true;
    },
    [record],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!record) return false;
      const ok = await verifyPassword(currentPassword, record.hash);
      if (!ok) return false;
      const hash = await hashPassword(newPassword);
      const rec: AuthRecord = { ...record, hash };
      saveRecord(rec);
      markUnlocked(rec);
      setRecord(rec);
      return true;
    },
    [record],
  );

  const setIntervalPref = useCallback((interval: LockInterval) => {
    setRecord((prev) => {
      if (!prev) return prev;
      const rec: AuthRecord = { ...prev, interval };
      saveRecord(rec);
      // Re-anchor the current unlock to the new cadence so switching it (from
      // the settings menu, where the user is already unlocked) doesn't get
      // stuck or immediately re-lock.
      markUnlocked(rec);
      return rec;
    });
  }, []);

  const lock = useCallback(() => {
    clearUnlock();
    setUnlocked(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      enabled: record !== null,
      locked: record !== null && !unlocked,
      interval: record?.interval ?? "daily",
      unlock,
      enable,
      disable,
      changePassword,
      setInterval: setIntervalPref,
      lock,
    }),
    [
      record,
      unlocked,
      unlock,
      enable,
      disable,
      changePassword,
      setIntervalPref,
      lock,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
