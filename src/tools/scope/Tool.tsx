import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Field, OutputArea } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { wrangleScope, type ScopeMode } from "./logic";

const SAMPLE = `# external + internal scope
10.0.0.0/24
10.0.1.10-10.0.1.20
10.0.1.15
192.168.1.1-5
https://target.example.com/login
dc01.corp.local:389
2001:db8::/48
10.0.0.5:443
10.0.0.256`;

function Stat({ value, label }: { value: number; label: string }) {
  if (value === 0) return null;
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

export default function ScopeTool() {
  const [mode, setMode] = useState<ScopeMode>("collapse");
  const [input, setInput] = useState("");

  const result = useMemo(() => wrangleScope(input), [input]);
  const { stats } = result;
  const hasInput = input.trim() !== "";

  const output =
    mode === "expand"
      ? result.hosts.join("\n")
      : mode === "collapse"
        ? result.cidrs.join("\n")
        : result.targets;

  const outputMeta =
    mode === "expand"
      ? { label: `IPv4 hosts (${result.hosts.length.toLocaleString()})`, filename: "hosts.txt" }
      : mode === "collapse"
        ? { label: `CIDRs (${result.cidrs.length.toLocaleString()})`, filename: "cidrs.txt" }
        : { label: "nmap output", filename: "nmap-targets.txt" };

  return (
    <>
      <Segmented<ScopeMode>
        aria-label="Output mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: "collapse", label: "CIDRs", title: "Minimal aggregated CIDR blocks" },
          { value: "expand", label: "Hosts", title: "Every IPv4 host, one per line (for nmap -iL)" },
          {
            value: "targets",
            label: "Nmap output",
            title: "One nmap-ready target string (CIDRs + IPv6 + hostnames)",
          },
        ]}
      />

      <Field
        label="Scope"
        hint="Paste anything: CIDRs, ranges (10.0.0.1-20), single IPs, URLs, host:port, IPv6, hostnames. Dupes, ports and junk are cleaned up; unrecognized tokens are surfaced below, never silently dropped."
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
          placeholder="10.0.0.0/24  ·  10.0.1.1-50  ·  https://host.example.com  ·  2001:db8::/48"
          rows={7}
        />
      </Field>

      {hasInput ? (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border bg-card/40 px-4 py-3">
            <Stat value={stats.ipv4Hosts} label="IPv4 hosts" />
            <Stat value={stats.ipv4Cidrs} label="CIDRs" />
            <Stat value={stats.ipv6} label="IPv6" />
            <Stat value={stats.hostnames} label="hostnames" />
            <Stat value={stats.duplicatesRemoved} label="dupes removed" />
            <Stat value={stats.invalid} label="skipped" />
            <Stat value={stats.malformed} label="possible typos" />
            {stats.ipv4Hosts === 0 &&
            stats.ipv6 === 0 &&
            stats.hostnames === 0 &&
            stats.invalid === 0 &&
            stats.malformed === 0 ? (
              <span className="text-sm text-muted-foreground">Nothing recognized yet.</span>
            ) : null}
          </div>

          {result.findings.length > 0 ? (
            <FindingsSection
              findings={result.findings}
              title="Notes"
              defaultOpen={result.findings.some((f) => f.severity !== "info")}
            />
          ) : null}

          {output ? (
            <OutputArea value={output} label={outputMeta.label} filename={outputMeta.filename} mono />
          ) : null}

          {/* IPv6 / hostnames aren't in the IPv4 expand/collapse output — show them
              on the side so nothing is lost. In Targets mode they're already merged. */}
          {mode !== "targets" && result.ipv6.length > 0 ? (
            <OutputArea
              value={result.ipv6.join("\n")}
              label={`IPv6 (${result.ipv6.length})`}
              filename="ipv6.txt"
              mono
            />
          ) : null}
          {mode !== "targets" && result.hostnames.length > 0 ? (
            <OutputArea
              value={result.hostnames.join("\n")}
              label={`Hostnames (${result.hostnames.length})`}
              filename="hostnames.txt"
              mono
            />
          ) : null}

          {result.invalid.length > 0 ? (
            <OutputArea
              value={result.invalid.join("\n")}
              label={`Skipped: unrecognized (${result.invalid.length})`}
              filename="skipped.txt"
              mono
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
