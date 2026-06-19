import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, ErrorNote } from "@/components/tool/parts";
import { cn } from "@/lib/utils";
import { inspect, summarizeFrom, type CharInfo } from "./logic";

/** A human-readable label for a code point that renders as blank/whitespace. */
function displayGlyph(info: CharInfo): { text: string; muted: boolean } {
  const { codePoint, flags, char } = info;
  if (codePoint === 0x20) return { text: "space", muted: true };
  if (codePoint === 0x09) return { text: "tab", muted: true };
  if (codePoint === 0x0a) return { text: "LF", muted: true };
  if (codePoint === 0x0d) return { text: "CR", muted: true };
  if (flags.zeroWidth || flags.invisible || flags.control) {
    return { text: "(hidden)", muted: true };
  }
  if (flags.combining) return { text: "◌" + char, muted: false };
  return { text: char, muted: false };
}

function flagLabels(info: CharInfo): string[] {
  const f = info.flags;
  const out: string[] = [];
  if (f.zeroWidth) out.push("zero-width");
  else if (f.invisible) out.push("invisible");
  if (f.control) out.push("control");
  if (f.combining) out.push("combining");
  return out;
}

export default function UnicodeInspectorTool() {
  const [input, setInput] = useState("");

  const { rows, summary, error } = useMemo(() => {
    try {
      // Compute inspect() once and derive the summary from it (summarize()
      // would otherwise re-run the full per-code-point inspection).
      const rows = inspect(input);
      return { rows, summary: summarizeFrom(rows, input), error: "" };
    } catch (e) {
      return {
        rows: [] as CharInfo[],
        summary: summarizeFrom([], ""),
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [input]);

  return (
    <>
      <Field label="Text to inspect">
        <Textarea
          autoFocus
          mono={false}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste text to inspect every character…"
          rows={5}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {input ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="muted">{summary.chars} chars</Badge>
          <Badge variant="muted">{summary.codePoints} code points</Badge>
          <Badge variant="muted">{summary.bytes} bytes</Badge>
          {summary.suspicious > 0 ? (
            <Badge variant="warning">
              {summary.suspicious} suspicious{" "}
              {summary.suspicious === 1 ? "character" : "characters"}
            </Badge>
          ) : null}
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left font-mono text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Char</th>
                <th className="px-3 py-2 font-medium">Code point</th>
                <th className="px-3 py-2 font-medium">Dec</th>
                <th className="px-3 py-2 font-medium">UTF-8</th>
                <th className="px-3 py-2 font-medium">JS</th>
                <th className="px-3 py-2 font-medium">HTML</th>
                <th className="px-3 py-2 font-medium">URL</th>
                <th className="px-3 py-2 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((info, i) => {
                const glyph = displayGlyph(info);
                const labels = flagLabels(info);
                const suspicious =
                  info.flags.zeroWidth || info.flags.invisible;
                return (
                  <tr
                    key={i}
                    className={cn(
                      "border-t border-border align-top",
                      suspicious && "bg-warning/10",
                    )}
                  >
                    <td className="px-3 py-1.5">
                      <span
                        className={cn(
                          "text-sm",
                          glyph.muted && "text-muted-foreground italic",
                        )}
                      >
                        {glyph.text}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">{info.hex}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {info.decimal}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {info.utf8Bytes}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {info.escapes.js}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {info.escapes.html}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {info.escapes.url}
                    </td>
                    <td className="px-3 py-1.5">
                      {labels.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {labels.map((l) => (
                            <Badge
                              key={l}
                              variant={suspicious ? "warning" : "outline"}
                            >
                              {l}
                            </Badge>
                          ))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{"—"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <Field
          label="Escaped"
          actions={
            <CopyButton
              value={rows.map((r) => r.escapes.js).join("")}
              label="Copy JS escapes"
            />
          }
        >
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-xs break-all">
            {rows.map((r) => r.escapes.js).join("")}
          </div>
        </Field>
      ) : null}
    </>
  );
}
