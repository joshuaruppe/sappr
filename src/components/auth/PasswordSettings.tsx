import { useState, type FormEvent } from "react";
import { ShieldCheck, TriangleAlert, Loader2, Check, Circle } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_RULES,
  isPasswordValid,
  LOCK_INTERVALS,
  type LockInterval,
} from "@/lib/auth";

type Mode = "idle" | "setup" | "change" | "remove";

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function PasswordSettings() {
  const { enabled, interval, enable, disable, changePassword, setInterval, lock } =
    useAuth();

  const [mode, setMode] = useState<Mode>("idle");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [setupInterval, setSetupInterval] = useState<LockInterval>("daily");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function reset(to: Mode) {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError("");
    setBusy(false);
    setSetupInterval(interval);
    setMode(to);
  }

  const policyOk = isPasswordValid(next);
  const mismatch = confirm.length > 0 && next !== confirm;
  const newValid = policyOk && next === confirm;

  async function onSetup(e: FormEvent) {
    e.preventDefault();
    if (!newValid || busy) return;
    setBusy(true);
    setError("");
    try {
      await enable(next, setupInterval);
      reset("idle");
    } catch {
      setError(GENERIC_ERROR);
      setBusy(false);
    }
  }

  async function onChange(e: FormEvent) {
    e.preventDefault();
    if (!current || !newValid || busy) return;
    setBusy(true);
    setError("");
    try {
      const ok = await changePassword(current, next);
      if (!ok) {
        setError("Current password is incorrect.");
        setBusy(false);
        return;
      }
      reset("idle");
    } catch {
      setError(GENERIC_ERROR);
      setBusy(false);
    }
  }

  async function onRemove(e: FormEvent) {
    e.preventDefault();
    if (!current || busy) return;
    setBusy(true);
    setError("");
    try {
      const ok = await disable(current);
      if (!ok) {
        setError("Current password is incorrect.");
        setBusy(false);
        return;
      }
      reset("idle");
    } catch {
      setError(GENERIC_ERROR);
      setBusy(false);
    }
  }

  // --- forget warning, shown when creating/changing a password -------------
  const forgetWarning = (
    <p className="flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/5 px-2.5 py-2 text-[0.7rem] leading-snug text-warning">
      <TriangleAlert className="mt-px size-3.5 shrink-0" />
      <span>
        There's no recovery. If you forget this password you'll have to clear
        this site's data (or reinstall the instance) to get back in.
      </span>
    </p>
  );

  // New + confirm password inputs with the live requirements checklist.
  // `autoFocusNew` focuses the first field (only when it's the first field on
  // screen — i.e. the setup flow, not change where "current" comes first).
  function newFields(autoFocusNew: boolean) {
    return (
      <>
        <Input
          type="password"
          className="h-8"
          placeholder={`New password (min ${MIN_PASSWORD_LENGTH})`}
          autoComplete="new-password"
          autoFocus={autoFocusNew}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          aria-invalid={next.length > 0 && !policyOk}
        />
        <Input
          type="password"
          className="h-8"
          placeholder="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch}
        />
        <ul className="flex flex-col gap-1" aria-label="Password requirements">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(next);
            return (
              <li
                key={rule.label}
                className={cn(
                  "flex items-center gap-1.5 text-[0.7rem] transition-colors",
                  met ? "text-success" : "text-muted-foreground",
                )}
              >
                {met ? (
                  <Check className="size-3 shrink-0" />
                ) : (
                  <Circle className="size-2.5 shrink-0" />
                )}
                <span>{rule.label}</span>
              </li>
            );
          })}
        </ul>
        {mismatch ? (
          <p className="text-[0.7rem] text-destructive">Passwords don't match.</p>
        ) : null}
      </>
    );
  }

  const errorNote = error ? (
    <p role="alert" className="text-[0.7rem] text-destructive">
      {error}
    </p>
  ) : null;

  if (mode === "setup") {
    return (
      <form onSubmit={onSetup} className="flex flex-col gap-2.5">
        {newFields(true)}
        <Segmented<LockInterval>
          aria-label="Re-prompt cadence"
          size="sm"
          fluid
          value={setupInterval}
          onChange={setSetupInterval}
          options={LOCK_INTERVALS}
        />
        {errorNote}
        {forgetWarning}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => reset("idle")}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="flex-1"
            disabled={!newValid || busy}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Enable"}
          </Button>
        </div>
      </form>
    );
  }

  if (mode === "change") {
    return (
      <form onSubmit={onChange} className="flex flex-col gap-2.5">
        <Input
          type="password"
          className="h-8"
          placeholder="Current password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoFocus
        />
        {newFields(false)}
        {errorNote}
        {forgetWarning}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => reset("idle")}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="flex-1"
            disabled={!current || !newValid || busy}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Update"}
          </Button>
        </div>
      </form>
    );
  }

  if (mode === "remove") {
    return (
      <form onSubmit={onRemove} className="flex flex-col gap-2.5">
        <p className="text-[0.7rem] text-muted-foreground">
          Confirm your password to turn off protection.
        </p>
        <Input
          type="password"
          className="h-8"
          placeholder="Current password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoFocus
        />
        {errorNote}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => reset("idle")}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            className="flex-1"
            disabled={!current || busy}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Remove"}
          </Button>
        </div>
      </form>
    );
  }

  // --- idle ----------------------------------------------------------------
  if (!enabled) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground">
            Require a password
          </span>
          <Button variant="outline" size="sm" onClick={() => reset("setup")}>
            Set up
          </Button>
        </div>
        <p className="text-[0.7rem] text-muted-foreground">
          Lock this instance behind a password. Handy for gating a shared,
          self-hosted deployment.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-success" />
        <span className="text-xs font-medium text-foreground">
          Password protection on
        </span>
      </div>

      <Segmented<LockInterval>
        aria-label="Re-prompt cadence"
        size="sm"
        fluid
        value={interval}
        onChange={setInterval}
        options={LOCK_INTERVALS}
      />
      <p className="text-[0.7rem] text-muted-foreground">
        How often to ask for the password on this device.
      </p>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => reset("change")}
        >
          Change
        </Button>
        <Button variant="ghost" size="sm" className="flex-1" onClick={lock}>
          Lock now
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-destructive hover:text-destructive"
        onClick={() => reset("remove")}
      >
        Remove password
      </Button>
    </div>
  );
}
