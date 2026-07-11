import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, OutputArea } from "@/components/tool/parts";
import { analyzeMacs, nvdSearchUrl, type MacResult } from "./logic";

const SAMPLE = `# arp -a style dump, mixed formats
00:1B:44:11:3A:B7
3C-22-FB-8E-11-22
0011.2233.4455
02:1a:2b:3c:4d:5e
01:00:5E:00:00:FB
FF:FF:FF:FF:FF:FF
00:11:22:33:44  - typo, missing an octet`;

export default function MacOuiTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<MacResult | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("./logic")
      .then((m) => m.getOuiCount())
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
    analyzeMacs(input)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch((e) => {
        if (!cancelled) setResult({ entries: [], malformed: [], error: String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  const copyText = useMemo(() => {
    if (!result) return "";
    return result.entries.map((e) => `${e.mac}\t${e.vendor ?? "(no registered vendor)"}`).join("\n");
  }, [result]);

  return (
    <>
      {count !== null ? (
        <div className="flex items-baseline gap-2 rounded-lg border border-border bg-card/40 px-4 py-3">
          <span className="text-2xl font-semibold tabular-nums">{count.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">
            IEEE OUI prefixes indexed · MA-L / MA-M / MA-S
          </span>
        </div>
      ) : null}

      <Field
        label="MAC addresses"
        hint="One per line or pasted in bulk: colon, hyphen, Cisco (0011.2233.4455) or bare 12-hex. MACs are pulled out of surrounding text, so arp/ip-neigh output works as-is."
        actions={
          <button
            onClick={() => setInput(SAMPLE)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Load sample
          </button>
        }
      >
        <Textarea
          autoFocus
          mono
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="00:1B:44:11:3A:B7  ·  3C-22-FB-8E-11-22  ·  0011.2233.4455"
          rows={6}
        />
      </Field>

      {result?.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : result && result.entries.length === 0 && result.malformed.length === 0 ? (
        <p className="text-sm text-muted-foreground">No MAC addresses found in the input.</p>
      ) : result ? (
        <div className="flex flex-col gap-3">
          {result.malformed.length > 0 ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="text-sm">
                {result.malformed.length}{" "}
                {result.malformed.length === 1 ? "token looks" : "tokens look"} like{" "}
                {result.malformed.length === 1
                  ? "a malformed MAC address"
                  : "malformed MAC addresses"}{" "}
                (not a valid 48-bit MAC), so likely a typo. Double-check{" "}
                {result.malformed.length === 1 ? "it" : "them"}:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.malformed.map((t) => (
                  <code
                    key={t}
                    className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-xs"
                  >
                    {t}
                  </code>
                ))}
              </div>
            </div>
          ) : null}
          {result.entries.map((e, i) => (
            <div key={e.mac + i} className="rounded-lg border border-border bg-card/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-medium">{e.mac}</span>
                <CopyButton value={e.mac} title="Copy MAC" className="size-7 text-muted-foreground" />
                <Badge variant={e.local ? "muted" : "primary"}>
                  {e.local ? "Locally administered" : "Universal"}
                </Badge>
                {e.multicast ? (
                  <Badge variant="muted">{e.broadcast ? "Broadcast" : "Multicast"}</Badge>
                ) : (
                  <Badge variant="muted">Unicast</Badge>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground">Vendor</span>
                  <span className={e.vendor ? "font-medium" : "italic text-muted-foreground"}>
                    {e.vendor ?? "no registered vendor"}
                  </span>
                  {e.vendor ? (
                    <a
                      href={nvdSearchUrl(e.vendor)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Search the NIST NVD for CVEs mentioning this vendor. Vendor-wide: an OUI can't identify the device model or firmware, so treat it as a lead, not a verdict."
                      className="inline-flex items-center gap-0.5 text-xs text-primary/80 transition-colors hover:text-primary hover:underline"
                    >
                      CVEs
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-muted-foreground">OUI</span>
                  <span className="font-mono">{e.oui}</span>
                  <CopyButton value={e.oui} title="Copy OUI" className="size-6 text-muted-foreground" />
                </span>
              </div>
              {e.note ? <p className="mt-2 text-sm text-muted-foreground">{e.note}</p> : null}
            </div>
          ))}

          {result.entries.length > 1 ? (
            <OutputArea
              value={copyText}
              label={`All results (${result.entries.length})`}
              filename="mac-vendors.tsv"
              mono
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
