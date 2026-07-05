import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { analyzeSerialized, type SerializedResult } from "./logic";

// A Java-serialized String "test" (AC ED 00 05 …).
const SAMPLE = "rO0ABXQABHRlc3Q=";

export default function SerializedTool() {
  const [input, setInput] = useState("");
  const [r, setR] = useState<SerializedResult | null>(null);

  useEffect(() => {
    if (input.trim() === "") {
      setR(null);
      return;
    }
    let cancelled = false;
    analyzeSerialized(input)
      .then((res) => {
        if (!cancelled) setR(res);
      })
      .catch((e) => {
        if (!cancelled) setR({ format: "", formatId: null, findings: [], error: String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  return (
    <>
      <Field
        label="Serialized blob"
        hint="Paste a serialized object as Base64, hex, or raw. The format is fingerprinted and decoded where cheap."
        actions={
          <button
            onClick={() => setInput(SAMPLE)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Load sample
          </button>
        }
      >
        <Textarea
          autoFocus
          mono
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={'rO0ABXQ…   or   O:8:"stdClass":1:{…}'}
          rows={5}
        />
      </Field>

      {input.trim() && r?.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {r && !r.error && r.formatId ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={r.formatId === "unknown" ? "muted" : "primary"}>{r.format}</Badge>
            {r.source ? <span className="text-muted-foreground">read as {r.source}</span> : null}
          </div>

          {r.findings.length ? <FindingsSection findings={r.findings} /> : null}

          {r.decoded ? (
            <OutputArea value={r.decoded} label="Decoded" filename="decoded.txt" mono />
          ) : null}

          {r.strings && r.strings.length ? (
            <OutputArea
              value={r.strings.join("\n")}
              label={`Strings (${r.strings.length})`}
              filename="strings.txt"
              mono
            />
          ) : null}

          {r.hex ? (
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hex preview
              </div>
              <div className="break-all font-mono text-[0.7rem] text-muted-foreground">{r.hex}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
