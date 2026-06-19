import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, ErrorNote } from "@/components/tool/parts";
import { parseInput, describe, type TimestampParts } from "./logic";

const ROWS: Array<{ key: keyof TimestampParts; label: string }> = [
  { key: "epochSeconds", label: "Unix (seconds)" },
  { key: "epochMillis", label: "Unix (milliseconds)" },
  { key: "iso", label: "ISO 8601 (UTC)" },
  { key: "utc", label: "UTC" },
  { key: "local", label: "Local" },
  { key: "rfc2822", label: "RFC 2822" },
  { key: "relative", label: "Relative" },
];

export default function TimestampTool() {
  const [input, setInput] = useState("");
  // Re-render every second so the relative time stays fresh while idle.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { parts, error } = useMemo(() => {
    if (!input.trim()) return { parts: null, error: "" };
    try {
      void tick; // keep `relative` current on each tick
      const date = parseInput(input);
      return { parts: describe(date), error: "" };
    } catch (e) {
      return {
        parts: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [input, tick]);

  function setNow() {
    setInput(String(Date.now()));
  }

  return (
    <>
      <Field
        label="Epoch or date"
        hint="A Unix timestamp (seconds or milliseconds) or an ISO / RFC date string."
        actions={
          <Button size="sm" variant="ghost" onClick={setNow}>
            <Clock className="size-3.5" />
            Now
          </Button>
        }
      >
        <Input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="1700000000 or 2023-11-14T22:13:20Z"
          spellCheck={false}
          className="font-mono"
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {parts ? (
        <Field label="Representations">
          <dl className="divide-y divide-border overflow-hidden rounded-md border border-input bg-muted/40">
            {ROWS.map(({ key, label }) => {
              const value = String(parts[key]);
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="break-all font-mono text-[0.8125rem] leading-relaxed">
                      {value}
                    </dd>
                  </div>
                  <CopyButton value={value} />
                </div>
              );
            })}
          </dl>
        </Field>
      ) : null}
    </>
  );
}
