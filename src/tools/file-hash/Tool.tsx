import { useEffect, useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";
import { Field, ErrorNote, FileDrop } from "@/components/tool/parts";
import { formatBytes } from "@/lib/utils";
import { hashFile, type FileHashes } from "./logic";

const ALGOS: { key: keyof FileHashes; label: string }[] = [
  { key: "md5", label: "MD5" },
  { key: "sha1", label: "SHA-1" },
  { key: "sha256", label: "SHA-256" },
];

export default function FileHashTool() {
  const [file, setFile] = useState<File | null>(null);
  const [hashes, setHashes] = useState<FileHashes | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setHashes(null);
      setProgress(0);
      setError("");
      setBusy(false);
      return;
    }

    let cancelled = false;
    setHashes(null);
    setError("");
    setBusy(true);
    setProgress(0);

    hashFile(file, (f) => {
      if (!cancelled) setProgress(f);
    })
      .then((result) => {
        if (!cancelled) setHashes(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
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
      <Field label="File">
        <FileDrop
          onFile={setFile}
          hint="Drop a file here, or click to browse. Hashed locally, never uploaded."
        />
      </Field>

      {file ? (
        <Field
          label="Selected"
          actions={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFile(null)}
              disabled={busy}
            >
              Clear
            </Button>
          }
        >
          <div className="flex items-center justify-between gap-3 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
            <span className="min-w-0 truncate font-medium">{file.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatBytes(file.size)}
            </span>
          </div>
        </Field>
      ) : null}

      {busy ? (
        <Field label="Hashing…">
          <div className="flex flex-col gap-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-150"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </Field>
      ) : null}

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {hashes
        ? ALGOS.map(({ key, label }) => (
            <Field
              key={key}
              label={label}
              actions={<CopyButton value={hashes[key]} />}
            >
              <div className="break-all rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-[0.8125rem] leading-relaxed">
                {hashes[key]}
              </div>
            </Field>
          ))
        : null}
    </>
  );
}
