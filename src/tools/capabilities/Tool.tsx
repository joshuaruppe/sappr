import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { parseCapabilities } from "./logic";

const SAMPLE = `/usr/bin/ping cap_net_raw=ep
/usr/bin/python3.11 cap_setuid=ep
/opt/tool/reader cap_dac_read_search=ep
/usr/bin/gdb cap_sys_ptrace=ep`;

export default function CapabilitiesTool() {
  const [input, setInput] = useState("");
  const r = useMemo(() => parseCapabilities(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="getcap output"
        hint="Paste `getcap -r / 2>/dev/null` output (or a single `cap_…+ep` string). Privilege-escalation capabilities are flagged."
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
          placeholder={"/usr/bin/python3.11 cap_setuid=ep"}
          rows={6}
        />
      </Field>

      {hasInput && r.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {!r.error && r.entries.length > 0 ? (
        <div className="flex flex-col gap-4">
          <FindingsSection
            findings={r.findings}
            emptyLabel="No privilege-escalation capabilities found."
          />

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Capabilities ({r.entries.length})
            </h3>
            <div className="flex flex-col gap-2">
              {r.entries.map((e, i) => (
                <div key={i} className="rounded-lg border border-border bg-card/40 p-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    {e.path ? (
                      <code className="font-mono text-xs text-foreground">{e.path}</code>
                    ) : null}
                    <span className="font-mono text-[0.7rem] text-muted-foreground">{e.flags}</span>
                  </div>
                  <div className="mt-1.5 flex flex-col gap-1">
                    {e.caps.map((c, j) => (
                      <div key={j} className="flex flex-wrap items-baseline gap-2 text-xs">
                        <span className="font-mono text-foreground">{c.name}</span>
                        {c.meaning ? (
                          <span className="text-muted-foreground">{c.meaning}</span>
                        ) : (
                          <span className="text-muted-foreground/60">(unrecognized)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
