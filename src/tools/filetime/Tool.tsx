import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Field, ErrorNote } from "@/components/tool/parts";
import { parseFiletime } from "./logic";

export default function FiletimeTool() {
  const [input, setInput] = useState("");
  const r = useMemo(() => parseFiletime(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="Windows FILETIME"
        hint="Decimal (e.g. 133736472000000000) or 0x-hex. Also handles the 0 / max 'never' sentinels."
      >
        <Input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="133736472000000000"
        />
      </Field>

      {hasInput && r.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {r.special ? (
        <div className="rounded-lg border border-border bg-card/40 p-3 text-sm text-muted-foreground">
          {r.special}
        </div>
      ) : null}

      {r.iso ? (
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card/40 p-3 text-sm">
          <div>
            <span className="text-muted-foreground/70">UTC:</span>{" "}
            <span className="font-mono text-foreground">{r.utc}</span>
          </div>
          <div>
            <span className="text-muted-foreground/70">ISO 8601:</span>{" "}
            <span className="font-mono text-foreground">{r.iso}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
