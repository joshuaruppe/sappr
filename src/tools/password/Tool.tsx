import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, ErrorNote } from "@/components/tool/parts";
import {
  generatePasswords,
  buildAlphabet,
  estimateEntropyBits,
  strengthLabel,
  type PasswordOptions,
} from "./logic";

const MIN_LEN = 4;
const MAX_LEN = 128;

function clampLength(n: number): number {
  if (!Number.isFinite(n)) return MIN_LEN;
  return Math.min(MAX_LEN, Math.max(MIN_LEN, Math.round(n)));
}

export default function PasswordTool() {
  const [length, setLength] = useState(20);
  const [lowercase, setLowercase] = useState(true);
  const [uppercase, setUppercase] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [count, setCount] = useState(1);

  const [passwords, setPasswords] = useState<string[]>([]);
  const [error, setError] = useState("");

  const opts: PasswordOptions = useMemo(
    () => ({
      length,
      lowercase,
      uppercase,
      digits,
      symbols,
      excludeAmbiguous,
    }),
    [length, lowercase, uppercase, digits, symbols, excludeAmbiguous],
  );

  // Effective alphabet size + entropy for the current settings.
  const { alphabetSize, bits, label, settingsError } = useMemo(() => {
    try {
      const size = buildAlphabet(opts).length;
      const b = estimateEntropyBits(opts.length, size);
      return {
        alphabetSize: size,
        bits: b,
        label: strengthLabel(b),
        settingsError: "",
      };
    } catch (e) {
      return {
        alphabetSize: 0,
        bits: 0,
        label: strengthLabel(0),
        settingsError: e instanceof Error ? e.message : String(e),
      };
    }
  }, [opts]);

  const generate = useCallback(() => {
    try {
      const n = Number.isInteger(count) && count >= 1 ? count : 1;
      setPasswords(generatePasswords(opts, n));
      setError("");
    } catch (e) {
      setPasswords([]);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [opts, count]);

  // Generate an initial password on mount.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allText = passwords.join("\n");
  const strengthVariant =
    label === "Strong" ? "success" : label === "Fair" ? "warning" : "muted";

  return (
    <>
      <Field
        label={`Length: ${length}`}
        actions={
          <Input
            type="number"
            min={MIN_LEN}
            max={MAX_LEN}
            value={length}
            onChange={(e) => setLength(clampLength(Number(e.target.value)))}
            className="h-8 w-20 text-right"
            aria-label="Length"
          />
        }
      >
        <input
          type="range"
          min={MIN_LEN}
          max={MAX_LEN}
          value={length}
          onChange={(e) => setLength(clampLength(Number(e.target.value)))}
          aria-label="Length slider"
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        />
      </Field>

      <Field label="Character sets">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Switch checked={lowercase} onChange={setLowercase} label="Lowercase" title="a–z" />
          <Switch checked={uppercase} onChange={setUppercase} label="Uppercase" title="A–Z" />
          <Switch checked={digits} onChange={setDigits} label="Digits" title="0–9" />
          <Switch checked={symbols} onChange={setSymbols} label="Symbols" title="!@#$…" />
          <Switch
            checked={excludeAmbiguous}
            onChange={setExcludeAmbiguous}
            label="Exclude ambiguous"
            title="Remove easily confused characters like O 0 I l 1 |"
          />
        </div>
      </Field>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Count" className="w-28">
          <Input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              setCount(Number.isFinite(n) && n >= 1 ? Math.min(100, n) : 1);
            }}
            className="h-9 w-20"
            aria-label="Count"
          />
        </Field>
        <Button variant="primary" onClick={generate} disabled={!!settingsError}>
          <RefreshCw className="size-4" />
          Generate
        </Button>
      </div>

      {settingsError ? <ErrorNote>{settingsError}</ErrorNote> : null}
      {error && !settingsError ? <ErrorNote>{error}</ErrorNote> : null}

      <Field
        label="Strength"
        actions={
          <span className="text-[0.7rem] tabular-nums text-muted-foreground">
            {alphabetSize} symbols · {bits.toFixed(1)} bits of entropy
          </span>
        }
      >
        <div className="flex items-center gap-3">
          <Badge variant={strengthVariant}>{label}</Badge>
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-valuenow={Math.round(bits)}
            aria-valuemin={0}
            aria-valuemax={128}
            aria-label="Entropy"
          >
            <div
              className={
                label === "Strong"
                  ? "h-full rounded-full bg-success transition-all"
                  : label === "Fair"
                    ? "h-full rounded-full bg-warning transition-all"
                    : "h-full rounded-full bg-destructive transition-all"
              }
              style={{ width: `${Math.min(100, (bits / 128) * 100)}%` }}
            />
          </div>
        </div>
      </Field>

      <Field
        label={passwords.length > 1 ? `Passwords (${passwords.length})` : "Password"}
        actions={<CopyButton value={allText} label="Copy all" />}
      >
        <div className="flex flex-col gap-2">
          {passwords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Press Generate to create a password.
            </p>
          ) : (
            passwords.map((pwd, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 shadow-inner"
              >
                <code className="min-w-0 flex-1 break-all font-mono text-[0.8125rem] leading-relaxed">
                  {pwd}
                </code>
                <CopyButton value={pwd} />
              </div>
            ))
          )}
        </div>
      </Field>
    </>
  );
}
