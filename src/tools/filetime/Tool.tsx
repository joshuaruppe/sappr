import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Field, ErrorNote } from "@/components/tool/parts";
import { Badge } from "@/components/ui/badge";
import { parseWindowsTime } from "./logic";

// A positive FILETIME (pwdLastSet-style Integer8) that decodes to Oct 2024.
const SAMPLE = "133736472000000000";

export default function FiletimeTool() {
  const [input, setInput] = useState("");
  const r = useMemo(() => parseWindowsTime(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="FILETIME / Integer8 value"
        hint="Enter a decimal (e.g. 133736472000000000) or 0x-hex integer. A positive value is a timestamp; a negative value (e.g. -36288000000000) is an AD duration; 0 and the max value are 'never' sentinels."
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
          placeholder="133736472000000000"
        />
      </Field>

      {hasInput && r.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {r.kind && !r.error ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card/40 p-3 text-sm">
            {r.kind === "special" ? (
              <div className="flex items-center gap-2">
                <Badge variant="muted">special</Badge>
                <span className="font-mono text-foreground">{r.special}</span>
              </div>
            ) : null}

            {r.kind === "duration" ? (
              <div className="flex items-center gap-2">
                <Badge variant="primary">duration</Badge>
                <span className="font-mono text-foreground">{r.duration}</span>
              </div>
            ) : null}

            {r.kind === "timestamp" ? (
              <>
                <div>
                  <Badge variant="primary">timestamp</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground/70">UTC:</span>{" "}
                  <span className="font-mono text-foreground">{r.utc}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/70">ISO 8601:</span>{" "}
                  <span className="font-mono text-foreground">{r.iso}</span>
                </div>
              </>
            ) : null}
          </div>

          {r.note ? <p className="text-xs text-muted-foreground">{r.note}</p> : null}
        </div>
      ) : null}
    </>
  );
}
