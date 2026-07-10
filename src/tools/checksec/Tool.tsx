import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote, FileDrop } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { parseElf, bytesFromInput, type ElfResult } from "./logic";

type Tone = "good" | "warn" | "bad" | "neutral";

const TONE: Record<Tone, string> = {
  good: "text-green-500",
  warn: "text-amber-500",
  bad: "text-red-500",
  neutral: "text-foreground",
};

function Mit({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="rounded-md border border-border bg-card/40 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium ${TONE[tone]}`}>{value}</div>
    </div>
  );
}

export default function ChecksecTool() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [r, setR] = useState<ElfResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let bytes: Uint8Array | null = null;
        if (file) bytes = new Uint8Array(await file.arrayBuffer());
        else if (text.trim()) bytes = bytesFromInput(text);
        if (!bytes) {
          if (!cancelled) {
            setR(null);
            setError("");
          }
          return;
        }
        const res = parseElf(bytes);
        if (!cancelled) {
          setR(res.error ? null : res);
          setError(res.error);
        }
      } catch {
        if (!cancelled) {
          setR(null);
          setError("Could not read the input — drop an ELF binary, or paste it as Base64 or hex.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, text]);

  return (
    <>
      <Field label="ELF binary">
        <FileDrop onFile={setFile} hint="Drop an ELF binary here, or click to browse." />
      </Field>

      <Field label="…or paste Base64 / hex" hint="Handy for a binary lifted from a sandbox report or a hexdump.">
        <Textarea
          mono
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="f0VMRgIBAQ…"
          rows={3}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {r ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-foreground">
              {r.bits}-bit {r.type}
            </span>
            <span>·</span>
            <span>{r.machine}</span>
            <span>·</span>
            <span>{r.endian}</span>
            <span>·</span>
            <span>{r.linkage}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Mit label="RELRO" value={r.relro} tone={r.relro === "Full" ? "good" : r.relro === "Partial" ? "warn" : "bad"} />
            <Mit label="Stack canary" value={r.canary ? "Found" : "Not found"} tone={r.canary ? "good" : "bad"} />
            <Mit label="NX" value={r.nx ? "Enabled" : "Disabled"} tone={r.nx ? "good" : "bad"} />
            <Mit label="PIE" value={r.pie} tone={r.pie === "PIE" ? "good" : r.pie === "No PIE" ? "bad" : "neutral"} />
            <Mit label="Fortify" value={r.fortify ? "Yes" : "No"} tone={r.fortify ? "good" : "neutral"} />
            <Mit label="Symbols" value={r.stripped ? "Stripped" : "Present"} tone="neutral" />
          </div>

          {r.rpath || r.runpath ? (
            <div className="rounded-lg border border-border bg-card/40 p-4 text-sm">
              {r.rpath ? (
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground sm:w-24">RPATH</span>
                  <span className="break-all font-mono">{r.rpath}</span>
                </div>
              ) : null}
              {r.runpath ? (
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground sm:w-24">RUNPATH</span>
                  <span className="break-all font-mono">{r.runpath}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <FindingsSection findings={r.findings} emptyLabel="Well-hardened — no missing mitigations flagged." />
        </div>
      ) : null}
    </>
  );
}
