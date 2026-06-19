import { useState, type FormEvent } from "react";
import { LockKeyhole, Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Full-screen gate shown when password protection is enabled and the instance
 * is locked. Replaces the entire app until a correct password is entered.
 */
export function LockScreen({
  onUnlock,
}: {
  onUnlock: (password: string) => Promise<boolean>;
}) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    setError("");
    try {
      const ok = await onUnlock(pw);
      if (!ok) {
        setError("Incorrect password.");
        setPw("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="app-backdrop" aria-hidden />
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/60 p-7 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-muted/50">
              <LockKeyhole className="size-5 text-muted-foreground" />
            </div>
            <Logo />
            <p className="text-sm text-muted-foreground">
              This instance is locked. Enter your password to continue.
            </p>
          </div>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
            <div className="relative">
              <Input
                autoFocus
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                aria-label="Password"
                aria-invalid={!!error}
                className="pr-10"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" variant="primary" disabled={!pw || busy}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Unlocking…
                </>
              ) : (
                "Unlock"
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
