import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/tool/parts";
import { analyzeDriver, getDriverCount, loldriversUrl, type LookupResult } from "./logic";

const SAMPLE = "4422851a0a102f654e95d3b79c357ae3af1b096d7d1576663c027cfbc04abaf9";

export default function LoldriversTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDriverCount()
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
      return;
    }
    let cancelled = false;
    analyzeDriver(input)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch((e) => {
        if (!cancelled) setResult({ query: input, kind: "hash", matches: [], error: String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  return (
    <>
      {count !== null ? (
        <div className="flex items-baseline gap-2 rounded-lg border border-border bg-card/40 px-4 py-3">
          <span className="text-2xl font-semibold tabular-nums">{count.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">
            drivers catalogued · known-vulnerable and malicious (LOLDrivers)
          </span>
        </div>
      ) : null}

      <Field
        label="Driver hash or filename"
        hint="Paste an MD5 / SHA-1 / SHA-256, or a driver filename (e.g. RTCore64.sys). Checked against the bundled LOLDrivers catalog."
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
          placeholder="RTCore64.sys  ·  01aa278b07b58dc4..."
          className="font-mono"
          spellCheck={false}
        />
      </Field>

      {result?.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : result && result.kind !== "empty" && result.matches.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/40 p-4 text-sm">
          <p className="font-medium">Not in the LOLDrivers catalog.</p>
          <p className="mt-1 text-muted-foreground">
            No known-vulnerable or malicious driver matched. Not being listed does not mean a driver
            is safe; the catalog only covers known entries.
          </p>
        </div>
      ) : result && result.matches.length > 0 ? (
        <div className="flex flex-col gap-3">
          {result.matches.map((m, i) => {
            const filename = m.matchedSample?.filename || m.driver.samples[0]?.filename || m.driver.id;
            const hvci = m.matchedSample ? m.matchedSample.hvci : m.driver.samples.some((s) => s.hvci);
            const malicious = /malicious/i.test(m.driver.category);
            return (
              <div key={m.driver.id + i} className="rounded-lg border border-border bg-card/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium">{filename}</span>
                  {malicious ? (
                    <Badge className="border-transparent bg-destructive/15 text-destructive">
                      malicious
                    </Badge>
                  ) : (
                    <Badge variant="warning">vulnerable driver</Badge>
                  )}
                  {hvci ? <Badge variant="muted">loads despite HVCI</Badge> : null}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {m.driver.author ? <span>Author: {m.driver.author}</span> : null}
                  <span>
                    {m.driver.samples.length} known sample{m.driver.samples.length === 1 ? "" : "s"}
                  </span>
                  <a
                    href={loldriversUrl(m.driver.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary/80 transition-colors hover:text-primary hover:underline"
                  >
                    LOLDrivers
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                {m.matchedSample ? (
                  <div className="mt-2 flex flex-col gap-0.5 break-all font-mono text-xs text-muted-foreground">
                    {m.matchedSample.md5 ? (
                      <div>
                        <span className="inline-block w-16 text-muted-foreground/70">MD5</span>
                        {m.matchedSample.md5}
                      </div>
                    ) : null}
                    {m.matchedSample.sha1 ? (
                      <div>
                        <span className="inline-block w-16 text-muted-foreground/70">SHA1</span>
                        {m.matchedSample.sha1}
                      </div>
                    ) : null}
                    {m.matchedSample.sha256 ? (
                      <div>
                        <span className="inline-block w-16 text-muted-foreground/70">SHA256</span>
                        {m.matchedSample.sha256}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
