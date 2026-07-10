import { useEffect, useState, type ReactNode } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field, ErrorNote, FileDrop } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { bytesFromInput } from "@/lib/bytes";
import { parseMacho, type MachoResult } from "./logic";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <Badge key={x} variant="muted">
          {x}
        </Badge>
      ))}
    </div>
  );
}

export default function MachoTool() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [r, setR] = useState<MachoResult | null>(null);
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
        const res = parseMacho(bytes);
        if (!cancelled) {
          setR(res.error ? null : res);
          setError(res.error);
        }
      } catch {
        if (!cancelled) {
          setR(null);
          setError("Could not read the input — drop a Mach-O binary, or paste it as Base64 or hex.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, text]);

  return (
    <>
      <Field label="Mach-O binary">
        <FileDrop onFile={setFile} hint="Drop a macOS/iOS binary here, or click to browse." />
      </Field>

      <Field label="…or paste Base64 / hex">
        <Textarea mono value={text} onChange={(e) => setText(e.target.value)} placeholder="z/rt/gcAAAE…" rows={3} />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {r ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-foreground">
              {r.bits}-bit {r.filetype}
            </span>
            <span>·</span>
            <span>{r.cpu}</span>
            <span>·</span>
            <span>{r.endian}</span>
            {r.signed ? <Badge variant="muted">signed</Badge> : null}
            {r.encrypted ? <Badge variant="primary">encrypted</Badge> : null}
          </div>

          {r.fatArches ? (
            <Section title={`Universal binary · ${r.fatArches.length} slices`}>
              <Chips items={r.fatArches.map((a) => a.cpu)} />
            </Section>
          ) : null}

          {r.flags.length ? (
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
              <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground sm:w-24">Flags</span>
              <Chips items={r.flags} />
            </div>
          ) : null}

          {r.entry || r.uuid ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {r.entry ? (
                <span>
                  <span className="text-muted-foreground">Entry </span>
                  <span className="font-mono">{r.entry}</span>
                </span>
              ) : null}
              {r.uuid ? (
                <span>
                  <span className="text-muted-foreground">UUID </span>
                  <span className="font-mono">{r.uuid}</span>
                </span>
              ) : null}
            </div>
          ) : null}

          {r.segments.length ? (
            <Section title={`Segments (${r.segments.length})`}>
              {r.segments.map((s) => (
                <div key={s.name} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <span className="shrink-0 font-mono text-sm sm:w-28">{s.name}</span>
                  <span className="min-w-0 break-all text-sm text-muted-foreground">
                    {s.sections.join(" ") || "—"}
                  </span>
                </div>
              ))}
            </Section>
          ) : null}

          {r.dylibs.length ? (
            <Section title={`Linked libraries (${r.dylibs.length})`}>
              <Chips items={r.dylibs} />
            </Section>
          ) : null}

          {r.rpaths.length ? (
            <Section title="@rpath">
              <Chips items={r.rpaths} />
            </Section>
          ) : null}

          <FindingsSection findings={r.findings} emptyLabel="No notable traits flagged." />
        </div>
      ) : null}
    </>
  );
}
