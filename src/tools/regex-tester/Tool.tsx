import { Fragment, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Field, ErrorNote } from "@/components/tool/parts";
import { runRegex } from "./logic";

const FLAGS: { flag: string; label: string; title: string }[] = [
  { flag: "g", label: "g", title: "Global: find all matches" },
  { flag: "i", label: "i", title: "Ignore case" },
  { flag: "m", label: "m", title: "Multiline: ^ and $ match line boundaries" },
  { flag: "s", label: "s", title: "Dotall: . matches newlines" },
  { flag: "u", label: "u", title: "Unicode" },
  { flag: "y", label: "y", title: "Sticky" },
];

interface Segment {
  text: string;
  match: boolean;
}

/** Split the text into highlighted / plain segments from match ranges. */
function buildSegments(
  text: string,
  ranges: { index: number; length: number }[],
): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.index > cursor) {
      segments.push({ text: text.slice(cursor, r.index), match: false });
    }
    const end = r.index + r.length;
    // Skip ranges that the cursor has already passed (overlaps).
    if (r.index < cursor) continue;
    if (end > r.index) {
      segments.push({ text: text.slice(r.index, end), match: true });
    }
    cursor = Math.max(cursor, end);
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }
  return segments;
}

export default function RegexTester() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<Record<string, boolean>>({ g: true });
  const [text, setText] = useState("");

  const flagString = useMemo(
    () => FLAGS.map((f) => f.flag).filter((f) => flags[f]).join(""),
    [flags],
  );

  const { matches, error } = useMemo(
    () => runRegex(pattern, flagString, text),
    [pattern, flagString, text],
  );

  const segments = useMemo(() => {
    if (!text || matches.length === 0) return null;
    const ranges = matches.map((m) => ({ index: m.index, length: m.match.length }));
    return buildSegments(text, ranges);
  }, [text, matches]);

  function toggleFlag(flag: string, checked: boolean) {
    setFlags((prev) => ({ ...prev, [flag]: checked }));
  }

  return (
    <>
      <Field label="Pattern">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground select-none font-mono text-sm">
            /
          </span>
          <Input
            autoFocus
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="(\d+)"
            className="font-mono"
            spellCheck={false}
          />
          <span className="text-muted-foreground select-none font-mono text-sm">
            /{flagString}
          </span>
        </div>
      </Field>

      <Field label="Flags">
        <div className="flex flex-wrap items-center gap-4">
          {FLAGS.map((f) => (
            <Switch
              key={f.flag}
              checked={!!flags[f.flag]}
              onChange={(c) => toggleFlag(f.flag, c)}
              label={f.label}
              title={f.title}
            />
          ))}
        </div>
      </Field>

      <Field label="Test string">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="a1b22"
          rows={6}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {pattern && !error ? (
        <Field
          label="Highlighted"
          actions={
            <Badge variant={matches.length ? "primary" : "muted"}>
              {matches.length} {matches.length === 1 ? "match" : "matches"}
            </Badge>
          }
        >
          <div className="border-input bg-muted/30 min-h-24 whitespace-pre-wrap break-words rounded-md border px-3 py-2 font-mono text-sm">
            {text === "" ? (
              <span className="text-muted-foreground">
                Enter a test string above.
              </span>
            ) : segments ? (
              segments.map((s, i) =>
                s.match ? (
                  <span key={i} className="bg-primary/20 rounded-sm">
                    {s.text}
                  </span>
                ) : (
                  <Fragment key={i}>{s.text}</Fragment>
                ),
              )
            ) : (
              text
            )}
          </div>
        </Field>
      ) : null}

      {!error && matches.length > 0 ? (
        <Field label="Matches">
          <div className="flex flex-col gap-2">
            {matches.map((m, i) => (
              <div
                key={i}
                className="border-input bg-card rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground shrink-0 text-xs">
                    #{i + 1} @ {m.index}
                  </span>
                  <span className="bg-primary/20 break-words rounded-sm px-1 font-mono">
                    {m.match}
                  </span>
                </div>
                {m.groups.length > 0 ? (
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {m.groups.map((g, gi) => (
                      <li key={gi} className="flex items-baseline gap-2">
                        <span className="text-muted-foreground shrink-0 text-xs">
                          group {gi + 1}
                        </span>
                        <span className="break-words font-mono text-xs">
                          {g === undefined ? (
                            <span className="text-muted-foreground italic">
                              undefined
                            </span>
                          ) : (
                            g
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {m.namedGroups ? (
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {Object.entries(m.namedGroups).map(([name, val]) => (
                      <li key={name} className="flex items-baseline gap-2">
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {name}
                        </span>
                        <span className="break-words font-mono text-xs">
                          {val}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </Field>
      ) : null}
    </>
  );
}
