import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { cn } from "@/lib/utils";
import { parseGroups } from "./logic";

const SAMPLE = `root:x:0:
sudo:x:27:alice,bob
docker:x:998:deploy
disk:x:6:backupsvc
adm:x:4:syslog,alice
shadow:x:42:
users:x:100:alice,bob,carol`;

export default function GroupTool() {
  const [input, setInput] = useState("");
  const r = useMemo(() => parseGroups(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="/etc/group"
        hint="Paste /etc/group. Membership in privilege-escalation groups (docker, lxd, disk, shadow, sudo…) is flagged."
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
          placeholder={"sudo:x:27:alice,bob\ndocker:x:998:deploy"}
          rows={7}
        />
      </Field>

      {hasInput && r.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {!r.error && r.groups.length > 0 ? (
        <div className="flex flex-col gap-4">
          <FindingsSection findings={r.findings} />

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Groups ({r.groups.length})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-2.5 py-1.5 font-medium">Group</th>
                    <th className="px-2.5 py-1.5 font-medium">GID</th>
                    <th className="px-2.5 py-1.5 font-medium">Members</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {r.groups.map((g) => (
                    <tr key={`${g.name}-${g.gid}`} className="border-t border-border/60">
                      <td className="px-2.5 py-1.5">
                        <span className={cn(g.privileged ? "text-warning" : "text-foreground")}>
                          {g.name}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 text-muted-foreground">{g.gid}</td>
                      <td className="px-2.5 py-1.5 text-muted-foreground">
                        {g.members.join(", ") || "—"}
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
