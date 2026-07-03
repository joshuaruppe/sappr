import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote } from "@/components/tool/parts";
import { FindingList } from "@/components/tool/findings";
import { Badge } from "@/components/ui/badge";
import { parseSudoers } from "./logic";

const SAMPLE = `Defaults        env_reset
Defaults        !authenticate

root    ALL=(ALL:ALL) ALL
%wheel  ALL=(ALL:ALL) ALL
alice   ALL=(ALL) NOPASSWD: ALL
bob     ALL=(root) /usr/bin/find, /usr/bin/less
deploy  ALL=(root) NOPASSWD: /opt/scripts/*
carol   ALL=(www-data) /usr/bin/systemctl restart nginx`;

export default function SudoersTool() {
  const [input, setInput] = useState("");
  const r = useMemo(() => parseSudoers(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="sudoers file or `sudo -l` output"
        hint="Pragmatic triage parser, not a full policy validator."
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
          placeholder={"alice ALL=(ALL) NOPASSWD: ALL\nbob ALL=(root) /usr/bin/find"}
          rows={8}
        />
      </Field>

      {hasInput && r.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {!r.error && r.rules.length > 0 ? (
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Findings
            </h3>
            <FindingList findings={r.findings} />
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rules ({r.rules.length})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-2.5 py-1.5 font-medium">Who</th>
                    <th className="px-2.5 py-1.5 font-medium">Run as</th>
                    <th className="px-2.5 py-1.5 font-medium">Pw</th>
                    <th className="px-2.5 py-1.5 font-medium">Commands</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {r.rules.map((rule, i) => (
                    <tr key={i} className="border-t border-border/60 align-top">
                      <td className="px-2.5 py-1.5 text-foreground">{rule.principal}</td>
                      <td className="px-2.5 py-1.5 text-muted-foreground">{rule.runas}</td>
                      <td className="px-2.5 py-1.5">
                        {rule.nopasswd ? (
                          <Badge className="bg-destructive/15 text-destructive border-transparent">
                            NOPASSWD
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/60">passwd</span>
                        )}
                      </td>
                      <td className="px-2.5 py-1.5 text-foreground">
                        {rule.commands.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
