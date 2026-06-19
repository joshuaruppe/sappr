import { useDeferredValue, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Badge } from "@/components/ui/badge";
import { Field, ErrorNote } from "@/components/tool/parts";
import { cn } from "@/lib/utils";
import { computeDiff, type DiffMode } from "./logic";

export default function DiffTool() {
  const [mode, setMode] = useState<DiffMode>("lines");
  const [original, setOriginal] = useState("");
  const [changed, setChanged] = useState("");
  // chars/words diff is Myers O(N·D); defer so large pastes don't block typing.
  const deferredOriginal = useDeferredValue(original);
  const deferredChanged = useDeferredValue(changed);

  const { parts, summary, error } = useMemo(() => {
    if (!deferredOriginal && !deferredChanged) {
      return { parts: [], summary: { added: 0, removed: 0 }, error: "" };
    }
    try {
      const { parts, summary } = computeDiff(
        deferredOriginal,
        deferredChanged,
        mode,
      );
      return { parts, summary, error: "" };
    } catch (e) {
      return {
        parts: [],
        summary: { added: 0, removed: 0 },
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [deferredOriginal, deferredChanged, mode]);

  const hasInput = Boolean(original || changed);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<DiffMode>
          aria-label="Granularity"
          value={mode}
          onChange={setMode}
          options={[
            { value: "lines", label: "Lines" },
            { value: "words", label: "Words" },
            { value: "chars", label: "Chars" },
          ]}
        />
        <div className="flex items-center gap-2">
          <Badge variant="success">+{summary.added}</Badge>
          <Badge className="border-transparent bg-destructive/15 text-destructive">
            -{summary.removed}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Original">
          <Textarea
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder={"the quick brown fox"}
            rows={8}
          />
        </Field>
        <Field label="Changed">
          <Textarea
            value={changed}
            onChange={(e) => setChanged(e.target.value)}
            placeholder={"the quick red fox"}
            rows={8}
          />
        </Field>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Field label="Diff">
        <div className="min-h-[6rem] whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/40 p-3 font-mono text-sm leading-relaxed">
          {!hasInput ? (
            <span className="text-muted-foreground">
              Enter text in both panes to see the differences.
            </span>
          ) : (
            parts.map((part, i) => (
              <span
                key={i}
                className={cn(
                  part.added && "bg-success/15 text-success",
                  part.removed && "bg-destructive/15 text-destructive line-through",
                )}
              >
                {part.value}
              </span>
            ))
          )}
        </div>
      </Field>
    </>
  );
}
