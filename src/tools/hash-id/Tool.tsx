import { useMemo, useState } from "react";
import { ChevronDown, Settings2, TriangleAlert } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, ErrorNote } from "@/components/tool/parts";
import { cn } from "@/lib/utils";
import { useCrackers } from "@/lib/settings";
import {
  identifyHash,
  buildHashcatCommand,
  buildJohnCommand,
  DEFAULT_WORDLIST,
  type Confidence,
  type CommandOptions,
} from "./logic";

const BADGE_VARIANT: Record<Confidence, "success" | "warning" | "muted"> = {
  high: "success",
  medium: "warning",
  low: "muted",
};

interface Crackers {
  hashcat: boolean;
  john: boolean;
}

function CommandRow({ label, command }: { label: string; command: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[0.7rem] font-medium text-muted-foreground">
        {label}
      </span>
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-md border border-border bg-muted/50 px-2.5 py-1.5 font-mono text-xs">
        {command}
      </code>
      <CopyButton value={command} />
    </div>
  );
}

function Labeled({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function CommandFlags({
  opts,
  set,
  crackers,
}: {
  opts: CommandOptions;
  set: (patch: Partial<CommandOptions>) => void;
  crackers: Crackers;
}) {
  const [open, setOpen] = useState(false);
  const toolNames = [
    crackers.hashcat && "hashcat",
    crackers.john && "John the Ripper",
  ].filter(Boolean) as string[];
  const flagsTitle = toolNames.length
    ? `${toolNames.join(" & ")} flags`
    : "Cracking tool flags";
  return (
    <div className="rounded-lg border border-border bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Settings2 className="size-3.5" />
        {flagsTitle}
        <ChevronDown
          className={cn("ml-auto size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-border/60 p-3">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            {crackers.hashcat && (
              <Labeled label={<>Workload <span className="font-mono">-w</span></>}>
                <Segmented<"default" | "1" | "3" | "4">
                  aria-label="hashcat workload"
                  size="sm"
                  value={(opts.workload ? String(opts.workload) : "default") as "default" | "1" | "3" | "4"}
                  onChange={(v) => set({ workload: v === "default" ? undefined : Number(v) })}
                  options={[
                    { value: "default", label: "Default" },
                    { value: "1", label: "Low" },
                    { value: "3", label: "High" },
                    { value: "4", label: "Nightmare" },
                  ]}
                />
              </Labeled>
            )}

            {crackers.hashcat && (
              <Labeled label={<>GPU device(s) <span className="font-mono">-d</span></>}>
                <Input
                  className="h-8 w-28"
                  placeholder="e.g. 1 or 1,2"
                  value={opts.device ?? ""}
                  onChange={(e) => set({ device: e.target.value.trim() || undefined })}
                />
              </Labeled>
            )}

            {crackers.john && (
              <Labeled label={<>john <span className="font-mono">--fork</span></>}>
                <Input
                  type="number"
                  min={1}
                  className="h-8 w-20"
                  placeholder="CPU"
                  value={opts.johnFork ?? ""}
                  onChange={(e) =>
                    set({ johnFork: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </Labeled>
            )}

            {crackers.hashcat && (
              <Switch
                checked={!!opts.optimized}
                onChange={(v) => set({ optimized: v })}
                label="Optimized kernels (-O)"
              />
            )}

            {crackers.hashcat && (
              <Switch
                checked={!!opts.username}
                onChange={(v) => set({ username: v })}
                label="Ignore usernames (--username)"
              />
            )}

            {crackers.john && (
              <Switch
                checked={!!opts.johnRules}
                onChange={(v) => set({ johnRules: v })}
                label="Mangling rules (--rules)"
              />
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Labeled
              label={<>Wordlist <span className="text-muted-foreground/60">(optional)</span></>}
            >
              <Input
                className="h-8 font-mono text-xs"
                value={opts.wordlist ?? ""}
                onChange={(e) => set({ wordlist: e.target.value.trim() || undefined })}
                placeholder={DEFAULT_WORDLIST}
              />
            </Labeled>

            {crackers.hashcat && (
              <Labeled
                label={
                  <>
                    Rules <span className="font-mono">-r</span>{" "}
                    <span className="text-muted-foreground/60">(hashcat, optional)</span>
                  </>
                }
              >
                <Input
                  className="h-8 font-mono text-xs"
                  value={opts.rules ?? ""}
                  onChange={(e) => set({ rules: e.target.value.trim() || undefined })}
                  placeholder="/usr/share/hashcat/rules/best64.rule"
                />
              </Labeled>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HashIdTool() {
  const [input, setInput] = useState("");
  const [opts, setOpts] = useState<CommandOptions>({});
  const set = (patch: Partial<CommandOptions>) => setOpts((o) => ({ ...o, ...patch }));
  const crackers = useCrackers();

  const { candidates, error } = useMemo(() => {
    try {
      return { candidates: identifyHash(input), error: "" };
    } catch (e) {
      return { candidates: [], error: e instanceof Error ? e.message : String(e) };
    }
  }, [input]);

  const showResults = input.trim() !== "" && !error;

  return (
    <>
      <Field
        label="Hash or credential to identify"
        hint="Paste a raw hash or a structured credential (NTLM, Kerberos, /etc/shadow, JWT, …)."
      >
        <Textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"$krb5tgs$23$*svc$REALM$service*$a1b2…\nor  d41d8cd98f00b204e9800998ecf8427e"}
          rows={3}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {showResults &&
        (candidates.length > 0 ? (
          <Field>
            <CommandFlags opts={opts} set={set} crackers={crackers} />

            <p className="mt-3 text-xs text-muted-foreground">
              The colored badge on each result is its{" "}
              <span className="font-medium text-foreground">match confidence</span>:{" "}
              how strongly the input fits that type.
            </p>

            <div className="mt-2 flex flex-col gap-3">
              {candidates.map((c) => {
                const hashcatCmd =
                  crackers.hashcat && !c.warning && c.hashcatMode !== undefined
                    ? buildHashcatCommand(c.hashcatMode, opts)
                    : undefined;
                const johnCmd =
                  crackers.john && !c.warning && c.johnFormat
                    ? buildJohnCommand(c.johnFormat, opts)
                    : undefined;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex flex-col gap-2.5 rounded-lg border p-3.5",
                      c.warning
                        ? "border-warning/40 bg-warning/5"
                        : "border-border bg-card/60",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{c.name}</span>
                      {c.warning ? (
                        <Badge variant="warning">malformed</Badge>
                      ) : (
                        <Badge
                          variant={BADGE_VARIANT[c.confidence]}
                          title="Match confidence: how strongly the input fits this type"
                        >
                          {c.confidence}
                        </Badge>
                      )}
                      <Badge variant="outline">{c.category}</Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">{c.context}</p>

                    {c.warning ? (
                      <p className="flex items-start gap-1.5 text-xs text-warning">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                        <span>{c.warning}</span>
                      </p>
                    ) : (
                      <>
                        {c.note ? (
                          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                            <span>{c.note}</span>
                          </p>
                        ) : null}
                        {(hashcatCmd || johnCmd) && (
                          <div className="flex flex-col gap-1.5 pt-0.5">
                            {hashcatCmd && (
                              <CommandRow label="hashcat" command={hashcatCmd} />
                            )}
                            {johnCmd && <CommandRow label="john" command={johnCmd} />}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Field>
        ) : (
          <Field label="Possible types">
            <p className="text-sm text-muted-foreground">
              No known hash type matches this input.
            </p>
          </Field>
        ))}
    </>
  );
}
