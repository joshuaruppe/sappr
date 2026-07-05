import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { Badge } from "@/components/ui/badge";
import { analyzeAuthorizedKeys, type SshKey, type Finding } from "./logic";

const B = "AAAAC3NzaC1lZDI1NTE5AAAAIL7v8kQ2sT4vN6wR9bX1cV3eZ5aH8dG0fL2pO4qU6rMz";
const SAMPLE = [
  `command="/usr/bin/rrsync -ro /srv",from="10.0.0.5" ssh-ed25519 ${B} backup@jump`,
  `ssh-ed25519 ${B.slice(0, -1)}y admin@laptop`,
  `ssh-dss ${B} legacy@oldhost`,
].join("\n");

export default function SshAuthorizedKeysTool() {
  const [input, setInput] = useState("");
  const [keys, setKeys] = useState<SshKey[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (input.trim() === "") {
      setKeys([]);
      setFindings([]);
      setError("");
      return;
    }
    let cancelled = false;
    analyzeAuthorizedKeys(input)
      .then((r) => {
        if (!cancelled) {
          setKeys(r.keys);
          setFindings(r.findings);
          setError(r.error);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setKeys([]);
          setFindings([]);
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  return (
    <>
      <Field
        label="authorized_keys"
        hint="Paste an SSH authorized_keys file. Each key is SHA-256 fingerprinted; weak algorithms and unrestricted (backdoor-shaped) keys are flagged."
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
          placeholder={"ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... user@host"}
          rows={6}
        />
      </Field>

      {input.trim() && error ? <ErrorNote>{error}</ErrorNote> : null}

      {keys.length > 0 ? (
        <div className="flex flex-col gap-4">
          <FindingsSection findings={findings} emptyLabel="No weak or unrestricted keys found." />

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Keys ({keys.length})
            </h3>
            <div className="flex flex-col gap-2">
              {keys.map((k, i) => (
                <div key={i} className="rounded-lg border border-border bg-card/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">
                      {k.type}
                      {k.bits ? ` ${k.bits}` : ""}
                    </Badge>
                    {k.restricted ? (
                      <Badge variant="success">restricted</Badge>
                    ) : (
                      <Badge className="border-transparent bg-warning/15 text-warning">
                        unrestricted
                      </Badge>
                    )}
                    {k.comment ? (
                      <span className="text-xs text-muted-foreground">{k.comment}</span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 break-all font-mono text-[0.7rem] text-foreground">
                    {k.fingerprint}
                  </div>
                  {k.options.length ? (
                    <div className="mt-1 break-all font-mono text-[0.7rem] text-muted-foreground">
                      {k.options.join(" · ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
