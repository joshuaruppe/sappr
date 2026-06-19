import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { Field, ErrorNote } from "@/components/tool/parts";
import { downloadBlob } from "@/lib/utils";
import {
  makeQrDataUrl,
  makeQrSvg,
  type ErrorCorrectionLevel,
} from "./logic";

const SIZES = ["128", "256", "512", "1024"] as const;
type SizeKey = (typeof SIZES)[number];

export default function QrGenerateTool() {
  const [text, setText] = useState("");
  const [level, setLevel] = useState<ErrorCorrectionLevel>("M");
  const [size, setSize] = useState<SizeKey>("256");
  const [margin, setMargin] = useState<number>(4);

  const width = Number(size);

  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!text) {
      setDataUrl("");
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    makeQrDataUrl(text, { errorCorrectionLevel: level, width, margin })
      .then((url) => {
        if (cancelled) return;
        setDataUrl(url);
        setError("");
      })
      .catch((e) => {
        if (cancelled) return;
        setDataUrl("");
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [text, level, width, margin]);

  async function downloadPng() {
    try {
      const url = await makeQrDataUrl(text, {
        errorCorrectionLevel: level,
        width,
        margin,
      });
      const blob = await (await fetch(url)).blob();
      downloadBlob(blob, "qr.png", "image/png");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function downloadSvg() {
    try {
      const svg = await makeQrSvg(text, {
        errorCorrectionLevel: level,
        margin,
      });
      downloadBlob(svg, "qr.svg", "image/svg+xml");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <Field label="Text or URL">
        <Textarea
          autoFocus
          mono={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://example.com"
          rows={4}
        />
      </Field>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Field label="Error correction" className="w-auto">
          <Segmented<ErrorCorrectionLevel>
            aria-label="Error correction level"
            value={level}
            onChange={setLevel}
            options={[
              { value: "L", label: "L" },
              { value: "M", label: "M" },
              { value: "Q", label: "Q" },
              { value: "H", label: "H" },
            ]}
          />
        </Field>

        <Field label="Size" className="w-auto">
          <Segmented<SizeKey>
            aria-label="Size"
            value={size}
            onChange={setSize}
            options={SIZES.map((s) => ({ value: s, label: `${s}px` }))}
          />
        </Field>

        <Field label={`Margin: ${margin}`} className="w-44">
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            aria-label="Margin"
            className="w-full accent-primary"
          />
        </Field>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Field
        label="QR code"
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={downloadPng}
              disabled={!dataUrl}
            >
              <Download className="size-3.5" />
              PNG
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={downloadSvg}
              disabled={!text || !!error}
            >
              <Download className="size-3.5" />
              SVG
            </Button>
          </>
        }
      >
        <div className="flex min-h-56 items-center justify-center rounded-md border border-input bg-muted/40 p-6 shadow-inner">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="Generated QR code"
              width={width}
              height={width}
              className="h-auto max-h-72 w-auto max-w-full rounded bg-white"
            />
          ) : (
            <span className="text-sm text-muted-foreground">
              {loading ? "Generating…" : "QR code will appear here…"}
            </span>
          )}
        </div>
      </Field>
    </>
  );
}
