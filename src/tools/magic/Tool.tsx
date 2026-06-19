import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, ErrorNote } from "@/components/tool/parts";
import { cn } from "@/lib/utils";
import { detectAndDecode, type Candidate } from "./logic";

const PREVIEW_LIMIT = 160;
// The recursive detect+score pipeline is O(candidates × words × length); beyond
// this we don't auto-decode, to keep the UI from stalling on a huge paste.
const MAX_INPUT = 200_000;

function previewOf(s: string): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > PREVIEW_LIMIT
    ? oneLine.slice(0, PREVIEW_LIMIT) + "…"
    : oneLine;
}

function scoreVariant(score: number): "success" | "warning" | "muted" {
  if (score >= 85) return "success";
  if (score >= 55) return "warning";
  return "muted";
}

export default function MagicTool() {
  const [input, setInput] = useState("");
  // Defer the expensive work so typing stays responsive on large inputs.
  const deferredInput = useDeferredValue(input);

  const { candidates, error } = useMemo(() => {
    if (!deferredInput) return { candidates: [] as Candidate[], error: "" };
    if (deferredInput.length > MAX_INPUT) {
      return {
        candidates: [] as Candidate[],
        error: `Input is too large to auto-decode (over ${MAX_INPUT.toLocaleString()} characters). Try a smaller slice.`,
      };
    }
    try {
      return {
        candidates: detectAndDecode(deferredInput, { maxDepth: 3 }),
        error: "",
      };
    } catch (e) {
      return {
        candidates: [] as Candidate[],
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [deferredInput]);

  return (
    <>
      <Field
        label="Unknown blob"
        hint="Paste anything: Base64, hex, ROT13, URL-encoded, byte lists, and nested layers are auto-detected and ranked."
      >
        <Textarea
          autoFocus
          mono
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="aGVsbG8gd29ybGQ="
          rows={5}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {input && !error ? (
        <Field
          label={
            candidates.length
              ? `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}`
              : "No candidates"
          }
        >
          {candidates.length === 0 ? (
            <p className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Nothing decoded cleanly. The input may already be plaintext or use
              an unsupported encoding.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {candidates.map((c, i) => (
                <li
                  key={c.output}
                  className={cn(
                    "flex flex-col gap-2 rounded-md border border-input bg-muted/30 px-3 py-2.5",
                    i === 0 && "border-primary/40 bg-primary/5",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {c.ops.map((op, j) => (
                        <Fragment key={j}>
                          {j > 0 && (
                            <ChevronRight className="size-3 text-muted-foreground" />
                          )}
                          <Badge variant={i === 0 ? "primary" : "outline"}>
                            {op}
                          </Badge>
                        </Fragment>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={scoreVariant(c.score)}>
                        score {Math.round(c.score)}
                      </Badge>
                      <span className="text-[0.7rem] tabular-nums text-muted-foreground">
                        {Math.round(c.printableRatio * 100)}% printable
                      </span>
                      <CopyButton value={c.output} />
                    </div>
                  </div>
                  <code className="block break-all font-mono text-[0.8125rem] leading-relaxed text-foreground/90">
                    {previewOf(c.output) || "(empty)"}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </Field>
      ) : null}
    </>
  );
}
