import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, ErrorNote } from "@/components/tool/parts";
import { hashAllText, HASH_ALGORITHMS, type HashResult } from "./logic";

export default function HashTextTool() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<HashResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }

    let ignore = false;
    setLoading(true);
    (async () => {
      try {
        const out = await hashAllText(input);
        if (ignore) return;
        setResults(out);
        setError("");
      } catch (e) {
        if (ignore) return;
        setResults([]);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [input]);

  const rows = results.length > 0 ? results : null;

  return (
    <>
      <Field label="Text to hash">
        <Textarea
          autoFocus
          mono={false}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="The quick brown fox"
          rows={6}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Field
        label="Digests"
        hint={loading && !rows ? "Computing…" : undefined}
      >
        <div className="overflow-hidden rounded-md border border-border">
          {HASH_ALGORITHMS.map((algo, i) => {
            const value = rows?.[i]?.value ?? "";
            return (
              <div
                key={algo}
                className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
              >
                <span className="w-28 shrink-0 select-none font-mono text-xs text-muted-foreground">
                  {algo}
                </span>
                <span className="min-w-0 flex-1 break-all font-mono text-xs">
                  {value || (
                    <span className="text-muted-foreground/50">
                      {loading ? "…" : "—"}
                    </span>
                  )}
                </span>
                <CopyButton value={value} title={`Copy ${algo}`} />
              </div>
            );
          })}
        </div>
      </Field>
    </>
  );
}
