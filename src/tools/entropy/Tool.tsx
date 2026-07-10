import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote, FileDrop } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { formatBytes } from "@/lib/utils";
import { bytesFromInput } from "@/lib/bytes";
import { analyzeEntropy, type EntropyResult } from "./logic";

function EntropyChart({ blocks }: { blocks: number[] }) {
  const w = 600;
  const h = 140;
  const pad = 4;
  const n = blocks.length;
  const pts = blocks
    .map((e, i) => {
      const x = pad + (n <= 1 ? 0 : (i / (n - 1)) * (w - 2 * pad));
      const y = pad + (1 - e / 8) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const threshY = pad + (1 - 7 / 8) * (h - 2 * pad);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full text-primary" preserveAspectRatio="none">
      <line
        x1={pad}
        y1={threshY}
        x2={w - pad}
        y2={threshY}
        className="stroke-muted-foreground/40"
        strokeDasharray="4 4"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Histogram({ hist }: { hist: number[] }) {
  const max = Math.max(...hist, 1);
  const h = 80;
  return (
    <svg viewBox={`0 0 512 ${h}`} className="h-20 w-full text-primary" preserveAspectRatio="none">
      {hist.map((c, i) => {
        const bh = (c / max) * h;
        return <rect key={i} x={i * 2} y={h - bh} width={1.6} height={bh} fill="currentColor" />;
      })}
    </svg>
  );
}

export default function EntropyTool() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [r, setR] = useState<EntropyResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let bytes: Uint8Array | null = null;
        if (file) bytes = new Uint8Array(await file.arrayBuffer());
        else if (text.trim()) bytes = bytesFromInput(text);
        if (!bytes || bytes.length === 0) {
          if (!cancelled) {
            setR(null);
            setError("");
          }
          return;
        }
        const res = analyzeEntropy(bytes);
        if (!cancelled) {
          setR(res);
          setError(res.error);
        }
      } catch {
        if (!cancelled) {
          setR(null);
          setError("Could not read the input — drop a file, or paste it as Base64 or hex.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, text]);

  return (
    <>
      <Field label="File">
        <FileDrop onFile={setFile} hint="Drop any file here, or click to browse." />
      </Field>

      <Field label="…or paste Base64 / hex">
        <Textarea
          mono
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="H4sIAAAA…"
          rows={3}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {r ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-3xl font-semibold tabular-nums">{r.overall.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">/ 8 bits · {formatBytes(r.size)}</span>
          </div>
          <p className="text-sm">{r.verdict}</p>

          <div className="rounded-lg border border-border bg-card/40 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Entropy over offset (dashed line = 7.0)
            </div>
            <EntropyChart blocks={r.blocks} />
          </div>

          <div className="rounded-lg border border-border bg-card/40 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Byte distribution (0–255)
            </div>
            <Histogram hist={r.histogram} />
          </div>

          <FindingsSection findings={r.findings} emptyLabel="No high-entropy regions flagged." />
        </div>
      ) : null}
    </>
  );
}
