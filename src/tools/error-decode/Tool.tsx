import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, ErrorNote } from "@/components/tool/parts";
import { decodeError, getCodeCount, type DecodeResult } from "./logic";

const SAMPLE = "0x80070005";

const FAMILY_VARIANT: Record<string, "primary" | "muted"> = {
  NTSTATUS: "primary",
  Win32: "primary",
  HRESULT: "primary",
};

export default function ErrorDecodeTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCodeCount()
      .then((n) => {
        if (!cancelled) setCount(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (input.trim() === "") {
      setResult(null);
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    decodeError(input)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch((e) => {
        if (!cancelled) setResult({ interpretations: [], error: String(e) });
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  const s = result?.hresultStructure;
  const nt = result?.ntstatusStructure;

  return (
    <>
      {count !== null ? (
        <div className="flex items-baseline gap-2 rounded-lg border border-border bg-card/40 px-4 py-3">
          <span className="text-2xl font-semibold tabular-nums">{count.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">
            codes indexed · NTSTATUS · Win32 · HRESULT
          </span>
        </div>
      ) : null}

      <Field
        label="Error code"
        hint="Paste a code as decimal, 0x-hex, or a signed (negative) value. It's matched against NTSTATUS, Win32 and HRESULT at once."
        actions={
          <button
            onClick={() => setInput(SAMPLE)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Load sample
          </button>
        }
      >
        <Input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="0xC0000022  ·  -1073741790  ·  0x80070005  ·  5"
          className="font-mono"
          spellCheck={false}
        />
      </Field>

      {result?.error ? <ErrorNote>{result.error}</ErrorNote> : null}

      {result && !result.error ? (
        <div className="flex flex-col gap-4">
          {result.hex ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>
                <span className="text-muted-foreground">Hex </span>
                <span className="font-mono">{result.hex}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Unsigned </span>
                <span className="font-mono">{result.decimal}</span>
              </span>
              {result.signed ? (
                <span>
                  <span className="text-muted-foreground">Signed </span>
                  <span className="font-mono">{result.signed}</span>
                </span>
              ) : null}
            </div>
          ) : null}

          {result.unrecognized && !busy ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="text-sm">
                No match among the {count?.toLocaleString() ?? "indexed"} codes — double-check the
                code you pasted. It may be mistyped, truncated, or in a different format.
              </p>
              {result.suggestions && result.suggestions.length > 0 ? (
                <div className="mt-3">
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Did you mean
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {result.suggestions.map((sg) => (
                      <button
                        key={sg.family + sg.code + sg.name}
                        onClick={() => setInput(sg.code)}
                        className="flex flex-col gap-0.5 rounded-md border border-border bg-card/50 px-3 py-2 text-left transition-colors hover:bg-muted sm:flex-row sm:items-baseline sm:gap-2"
                      >
                        <span className="font-mono text-sm">{sg.code}</span>
                        <span className="font-mono text-sm font-medium">{sg.name}</span>
                        <span className="text-xs text-muted-foreground">{sg.family}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {result.interpretations.map((i, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-card/40 p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Badge variant={FAMILY_VARIANT[i.family] ?? "muted"}>{i.family}</Badge>
                <span className="font-mono text-sm">{i.code}</span>
                {i.note ? <span className="text-xs text-muted-foreground">· {i.note}</span> : null}
              </div>
              <div className="mb-1 flex flex-wrap gap-x-2 font-mono text-sm font-medium">
                {i.names.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{i.description}</p>
            </div>
          ))}

          {s ? (
            <div className="rounded-lg border border-border bg-card/40 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                HRESULT structure
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={s.severity === "Failure" ? "primary" : "muted"}>{s.severity}</Badge>
                <Badge variant="muted">{s.facility}</Badge>
                <Badge variant="muted">code 0x{s.code.toString(16).padStart(4, "0")}</Badge>
                {s.customer ? <Badge variant="muted">customer bit</Badge> : null}
              </div>
            </div>
          ) : null}

          {nt ? (
            <div className="rounded-lg border border-border bg-card/40 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                NTSTATUS structure
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={nt.severity === "Error" ? "primary" : "muted"}>{nt.severity}</Badge>
                <Badge variant="muted">{nt.facility}</Badge>
                <Badge variant="muted">code 0x{nt.code.toString(16).padStart(4, "0")}</Badge>
                {nt.customer ? <Badge variant="muted">customer bit</Badge> : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
