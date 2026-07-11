import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, ErrorNote } from "@/components/tool/parts";
import { decodeTimestamp } from "./logic";

const SAMPLE = "125911584000000000";

export default function TimestampForensicsTool() {
  const [input, setInput] = useState("");
  const { interpretations, error } = useMemo(() => decodeTimestamp(input), [input]);

  return (
    <>
      <Field
        label="Timestamp"
        hint="Paste a raw numeric timestamp (decimal or 0x-hex). Every epoch format that yields a believable date is shown, likeliest first."
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
          placeholder="1700000000  ·  133544448000000000  ·  0x655324C0"
          className="font-mono"
          spellCheck={false}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {interpretations.length > 0 ? (
        <div className="flex flex-col gap-2">
          {interpretations.map((i) => (
            <div
              key={i.format}
              className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${
                i.likely ? "border-border bg-card" : "border-border/40"
              }`}
            >
              <span className={`flex items-center text-sm ${i.likely ? "" : "text-muted-foreground"}`}>
                {i.format}
                {i.likely ? (
                  <span className="ml-2">
                    <Badge variant="primary">likely</Badge>
                  </span>
                ) : null}
              </span>
              <span className={`font-mono text-sm ${i.likely ? "" : "text-muted-foreground"}`}>
                {i.utc}
              </span>
            </div>
          ))}
        </div>
      ) : input.trim() && !error ? (
        <p className="text-sm text-muted-foreground">
          No believable date in any known epoch format (all results fall outside 1950-2200).
        </p>
      ) : null}
    </>
  );
}
