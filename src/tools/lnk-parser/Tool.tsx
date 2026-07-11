import { useEffect, useState, type ReactNode } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field, ErrorNote, FileDrop } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { parseLnk, bytesFromInput, type LnkResult } from "./logic";

function Row({ label, value, mono }: { label: string; value?: string | number; mono?: boolean }) {
  if (value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground sm:w-36">
        {label}
      </span>
      <span className={`min-w-0 break-all text-sm ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

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

export default function LnkParserTool() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [r, setR] = useState<LnkResult | null>(null);
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
        const res = parseLnk(bytes);
        if (!cancelled) {
          setR(res.error ? null : res);
          setError(res.error);
        }
      } catch {
        if (!cancelled) {
          setR(null);
          setError("Could not read the input - drop a .lnk file, or paste it as Base64 or hex.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, text]);

  const hasTarget = r && (r.targetPath || r.arguments || r.workingDir || r.netName || r.name || r.relativePath || r.iconLocation);
  const hasOrigin = r && (r.volume || r.tracker);
  const volume = r?.volume
    ? [r.volume.driveType, r.volume.serial && `serial ${r.volume.serial}`, r.volume.label && `"${r.volume.label}"`]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <>
      <Field label="Shortcut file">
        <FileDrop onFile={setFile} hint="Drop a .lnk here, or click to browse." />
      </Field>

      <Field
        label="…or paste Base64 / hex"
        hint="Useful when the shortcut arrived as an encoded blob (email dump, JSON, sandbox report)."
      >
        <Textarea
          mono
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="TAAAAAEUAgAAAAAAwAAAAAAAAEY…"
          rows={3}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {r ? (
        <div className="flex flex-col gap-4">
          <FindingsSection findings={r.findings} emptyLabel="No red flags in this shortcut." />

          {hasTarget ? (
            <Section title="Target">
              <Row label="Target path" value={r.targetPath} mono />
              <Row label="Arguments" value={r.arguments} mono />
              <Row label="Working dir" value={r.workingDir} mono />
              <Row label="Network share" value={r.netName} mono />
              <Row label="Relative path" value={r.relativePath} mono />
              <Row label="Icon" value={r.iconLocation} mono />
              <Row label="Name / comment" value={r.name} />
            </Section>
          ) : null}

          <Section title="Metadata">
            <Row label="Created" value={r.creationTime} />
            <Row label="Accessed" value={r.accessTime} />
            <Row label="Modified" value={r.writeTime} />
            <Row label="Show window" value={r.showCommand} />
            <Row label="Icon index" value={r.iconIndex} />
            <Row label="Target size" value={r.fileSize ? `${r.fileSize} bytes` : undefined} />
            <Row label="Hotkey" value={r.hotKey} />
            {r.flags.length ? (
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground sm:w-36">
                  Link flags
                </span>
                <Chips items={r.flags} />
              </div>
            ) : null}
            {r.fileAttributes.length ? (
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground sm:w-36">
                  File attributes
                </span>
                <Chips items={r.fileAttributes} />
              </div>
            ) : null}
          </Section>

          {hasOrigin ? (
            <Section title="Origin (attribution)">
              <Row label="Volume" value={volume} />
              <Row label="Machine" value={r.tracker?.machineId} />
              <Row label="MAC address" value={r.tracker?.macAddress} mono />
              <Row label="Droid volume" value={r.tracker?.droidVolume} mono />
              <Row label="Droid file" value={r.tracker?.droidFile} mono />
            </Section>
          ) : null}

          {r.extraBlocks.length ? (
            <Section title="Extra-data blocks">
              <Chips items={r.extraBlocks} />
            </Section>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
