import { useEffect, useState, type ReactNode } from "react";
import { Field, ErrorNote, FileDrop } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { parseImageMetadata, type MetadataResult } from "./logic";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

export default function ExifViewerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<MetadataResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) {
      setResult(null);
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    setResult(null);
    file
      .arrayBuffer()
      .then((buf) => parseImageMetadata(buf))
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch((e) => {
        if (!cancelled)
          setResult({ groups: [], findings: [], tagCount: 0, error: String(e) });
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <>
      <Field label="Image">
        <FileDrop onFile={setFile} hint="Drop an image (JPEG, PNG, HEIC, TIFF…), or click to browse." />
      </Field>

      {busy ? <p className="text-sm text-muted-foreground">Reading metadata…</p> : null}

      {result?.error ? <ErrorNote>{result.error}</ErrorNote> : null}

      {result && !result.error ? (
        <div className="flex flex-col gap-4">
          <FindingsSection findings={result.findings} emptyLabel="No privacy-relevant metadata found." />

          {result.gps ? (
            <Section title="Location">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground sm:w-32">
                  Coordinates
                </span>
                <span className="font-mono text-sm">
                  {result.gps.lat}, {result.gps.lon}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground sm:w-32">
                  Map
                </span>
                <a
                  href={result.gps.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline underline-offset-2 hover:opacity-80"
                >
                  Open on OpenStreetMap ↗
                </a>
              </div>
            </Section>
          ) : null}

          {result.groups.map((g) => (
            <Section key={g.title} title={g.title}>
              {g.fields.map((f) => (
                <div key={f.key} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground sm:w-48">
                    {f.key}
                  </span>
                  <span className="min-w-0 break-all text-sm">{f.value}</span>
                </div>
              ))}
            </Section>
          ))}

          <p className="text-xs text-muted-foreground">{result.tagCount} tags read · all parsing done locally in your browser.</p>
        </div>
      ) : null}
    </>
  );
}
