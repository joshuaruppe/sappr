import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Field, ErrorNote } from "@/components/tool/parts";
import { Badge } from "@/components/ui/badge";
import { FindingsSection } from "@/components/tool/findings";
import { parseUac } from "./logic";

// 4194816 = 0x400200: NORMAL_ACCOUNT (0x200) + DONT_REQ_PREAUTH (0x400000),
// an AS-REP roastable user (high-severity finding).
const SAMPLE = "4194816";

export default function UacTool() {
  const [input, setInput] = useState("");
  const r = useMemo(() => parseUac(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="userAccountControl value"
        hint="Decimal (e.g. 66048) or hex (e.g. 0x10200)."
        actions={
          <button
            onClick={() => setInput(SAMPLE)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Load sample
          </button>
        }
      >
        <Input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="66048"
        />
      </Field>

      {hasInput && r.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {r.value !== null && !r.error ? (
        <>
          <FindingsSection findings={r.findings} emptyLabel="No security-relevant flags set." />
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/40 p-3">
          <div className="text-xs text-muted-foreground">
            <span className="text-muted-foreground/70">Value:</span>{" "}
            <span className="font-mono text-foreground">{r.value}</span> ·{" "}
            <span className="font-mono text-foreground">{r.hex}</span>
          </div>
          {r.flags.length ? (
            <div className="flex flex-col gap-1.5">
              {r.flags.map((f) => (
                <div key={f.bit} className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant={f.note ? "warning" : "muted"}>{f.name}</Badge>
                  <span className="font-mono text-muted-foreground/60">{f.hex}</span>
                  {f.note ? <span className="text-foreground">{f.note}</span> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No known flags set.</p>
          )}
          {r.leftover ? (
            <p className="text-xs text-muted-foreground/70">
              Unrecognized bits: 0x{r.leftover.toString(16)}
            </p>
          ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}
