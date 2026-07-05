import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { cn } from "@/lib/utils";
import { parseAccounts } from "./logic";

const SAMPLE = `root:x:0:0:root:/root:/bin/bash
backdoor:x:0:0::/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
svc_deploy:x:999:999::/opt/app:/bin/bash
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin`;

export default function PasswdTool() {
  const [input, setInput] = useState("");
  const r = useMemo(() => parseAccounts(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="/etc/passwd and/or /etc/shadow"
        hint="Paste one or both files (/etc/passwd, /etc/shadow)."
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
          placeholder={"root:x:0:0:root:/root:/bin/bash\nroot:$6$…:19700:0:99999:7:::"}
          rows={7}
        />
      </Field>

      {hasInput && r.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {!r.error && (r.passwd.length > 0 || r.shadow.length > 0) ? (
        <div className="flex flex-col gap-4">
          <FindingsSection findings={r.findings} />

          {r.passwd.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Accounts ({r.passwd.length})
              </h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-2.5 py-1.5 font-medium">User</th>
                      <th className="px-2.5 py-1.5 font-medium">UID</th>
                      <th className="px-2.5 py-1.5 font-medium">GID</th>
                      <th className="px-2.5 py-1.5 font-medium">Shell</th>
                      <th className="px-2.5 py-1.5 font-medium">Home</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {r.passwd.map((e) => (
                      <tr key={`${e.name}-${e.uid}`} className="border-t border-border/60">
                        <td className="px-2.5 py-1.5">
                          <span className="text-foreground">{e.name}</span>
                          {e.uid === 0 && e.name !== "root" ? (
                            <span className="ml-1.5 rounded bg-destructive/15 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-destructive">
                              uid 0
                            </span>
                          ) : null}
                        </td>
                        <td
                          className={cn(
                            "px-2.5 py-1.5",
                            e.uid === 0 && e.name !== "root" && "text-destructive",
                          )}
                        >
                          {e.uid}
                        </td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">{e.gid}</td>
                        <td
                          className={cn(
                            "px-2.5 py-1.5",
                            e.loginShell ? "text-foreground" : "text-muted-foreground/70",
                          )}
                        >
                          {e.shell || "—"}
                        </td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">{e.home}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {r.shadow.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Shadow ({r.shadow.length})
              </h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-2.5 py-1.5 font-medium">User</th>
                      <th className="px-2.5 py-1.5 font-medium">Password</th>
                      <th className="px-2.5 py-1.5 font-medium">State</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {r.shadow.map((s) => (
                      <tr key={s.name} className="border-t border-border/60">
                        <td className="px-2.5 py-1.5 text-foreground">{s.name}</td>
                        <td
                          className={cn(
                            "px-2.5 py-1.5",
                            s.state === "empty"
                              ? "text-destructive"
                              : s.weak
                                ? "text-warning"
                                : "text-muted-foreground",
                          )}
                        >
                          {s.scheme}
                        </td>
                        <td className="px-2.5 py-1.5 text-muted-foreground/80">{s.state}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
