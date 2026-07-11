import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field, ErrorNote, FileDrop } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { parsePe, bytesFromInput, type PeResult } from "./logic";

type Tone = "good" | "bad" | "neutral";
const TONE: Record<Tone, string> = {
  good: "text-green-500",
  bad: "text-red-500",
  neutral: "text-foreground",
};

function Mit({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card/40 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium ${on ? TONE.good : TONE.bad}`}>{on ? "Yes" : "No"}</div>
    </div>
  );
}

export default function PeInspectorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [r, setR] = useState<PeResult | null>(null);
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
        const res = parsePe(bytes);
        if (!cancelled) {
          setR(res.error ? null : res);
          setError(res.error);
        }
      } catch {
        if (!cancelled) {
          setR(null);
          setError("Could not read the input - drop a PE file, or paste it as Base64 or hex.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, text]);

  return (
    <>
      <Field label="PE file (EXE / DLL / SYS)">
        <FileDrop onFile={setFile} hint="Drop a PE binary here, or click to browse." />
      </Field>

      <Field label="…or paste Base64 / hex">
        <Textarea
          mono
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="TVqQAAMAAAAEAAAA…"
          rows={3}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {r ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <Badge variant="primary">{r.format}</Badge>
            <span className="text-foreground">{r.kind}</span>
            <span>·</span>
            <span>{r.machine}</span>
            <span>·</span>
            <span>{r.subsystem}</span>
            {r.signed ? <Badge variant="muted">signed</Badge> : null}
            {r.dotnet ? <Badge variant="muted">.NET</Badge> : null}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>
              <span className="text-muted-foreground">Entry </span>
              <span className="font-mono">{r.entryPoint}</span>
            </span>
            <span>
              <span className="text-muted-foreground">ImageBase </span>
              <span className="font-mono">{r.imageBase}</span>
            </span>
            {r.timestamp ? (
              <span>
                <span className="text-muted-foreground">Compiled </span>
                <span className="font-mono">{r.timestamp}</span>
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Mit label="ASLR" on={r.mitigations.aslr} />
            <Mit label="DEP" on={r.mitigations.dep} />
            <Mit label="CFG" on={r.mitigations.cfg} />
            <Mit label="SEH" on={r.mitigations.seh} />
            <Mit label="High-entropy" on={r.mitigations.highEntropyVa} />
          </div>

          {r.sections.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Section</th>
                    <th className="px-3 py-2 text-right font-medium">VirtAddr</th>
                    <th className="px-3 py-2 text-right font-medium">VirtSize</th>
                    <th className="px-3 py-2 text-right font-medium">RawSize</th>
                    <th className="px-3 py-2 text-center font-medium">Perms</th>
                    <th className="px-3 py-2 text-right font-medium">Entropy</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {r.sections.map((s, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5">{s.name}</td>
                      <td className="px-3 py-1.5 text-right">0x{s.vaddr.toString(16)}</td>
                      <td className="px-3 py-1.5 text-right">0x{s.vsize.toString(16)}</td>
                      <td className="px-3 py-1.5 text-right">0x{s.rawSize.toString(16)}</td>
                      <td className="px-3 py-1.5 text-center">{s.perms}</td>
                      <td className={`px-3 py-1.5 text-right ${s.entropy >= 7.2 ? "text-amber-500" : ""}`}>
                        {s.entropy.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {r.imports.length ? (
            <div className="rounded-lg border border-border bg-card/40 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Imports ({r.imports.length} DLLs)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.imports.map((imp) => (
                  <Badge key={imp.dll} variant="muted">
                    {imp.dll} · {imp.count}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <FindingsSection findings={r.findings} emptyLabel="No notable traits flagged." />
        </div>
      ) : null}
    </>
  );
}
