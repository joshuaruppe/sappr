import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { lintProfile } from "./logic";

const SAMPLE = `# sloppy demo profile
set sleeptime "1000";
set jitter "0";
set host_stage "true";
set pipename "msagent_1234";

http-get {
    set uri "/cx /image.gif";
    client {
        header "Host" "cdn.example.com";
    }
}
http-post {
    set uri "/submit.php";
}`;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </span>
  );
}

export default function C2ProfileTool() {
  const [input, setInput] = useState("");
  const result = useMemo(() => lintProfile(input), [input]);
  const { summary } = result;
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="Malleable C2 profile"
        hint="Paste a Cobalt Strike profile. Indicators are parsed out and OPSEC red flags are surfaced. It stays in your browser."
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
          placeholder='set sleeptime "45000";  http-get { set uri "/path"; }  ...'
          rows={9}
        />
      </Field>

      {hasInput ? (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border bg-card/40 px-4 py-3">
            <Stat label="sleep" value={summary.sleeptime === null ? "default" : `${summary.sleeptime}ms`} />
            <Stat label="jitter" value={summary.jitter === null ? "default" : `${summary.jitter}%`} />
            <Stat
              label="staging"
              value={summary.hostStage === null ? "unset" : summary.hostStage ? "on" : "off"}
            />
            <Stat label="GET URIs" value={summary.getUris.length} />
            <Stat label="POST URIs" value={summary.postUris.length} />
            {summary.pipename ? <Stat label="pipe" value={summary.pipename} /> : null}
          </div>

          {summary.userAgent ? (
            <div className="text-sm">
              <span className="text-muted-foreground">User-Agent </span>
              <span className="font-mono">{summary.userAgent}</span>
            </div>
          ) : null}

          {summary.getUris.length + summary.postUris.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {[
                ...summary.getUris.map((u) => ["GET", u] as const),
                ...summary.postUris.map((u) => ["POST", u] as const),
              ].map(([verb, u], i) => (
                <span
                  key={verb + u + i}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs"
                >
                  <span className="font-semibold text-muted-foreground">{verb}</span>
                  <span className="font-mono">{u}</span>
                </span>
              ))}
            </div>
          ) : null}

          <FindingsSection
            findings={result.findings}
            title="OPSEC findings"
            emptyLabel="No red flags in the parsed indicators."
            defaultOpen={result.findings.some((f) => f.severity !== "info")}
          />
        </>
      ) : null}
    </>
  );
}
