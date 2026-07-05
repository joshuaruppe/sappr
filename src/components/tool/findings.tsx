import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

/** Severity ranking shared by the Linux triage tools (and anything else that
 * emits prioritized findings). "high" is most severe. */
export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
  /** Subject of the finding (account, rule, path…), if any. */
  account?: string;
}

const SEV: Record<Severity, { label: string; text: string; className: string; countClass: string }> = {
  high: {
    label: "High",
    text: "HIGH",
    className: "bg-destructive/15 text-destructive border-transparent",
    countClass: "bg-destructive/15 text-destructive",
  },
  medium: {
    label: "Med",
    text: "MED",
    className: "bg-warning/15 text-warning border-transparent",
    countClass: "bg-warning/15 text-warning",
  },
  info: {
    label: "Info",
    text: "INFO",
    className: "bg-muted text-muted-foreground border-transparent",
    countClass: "bg-muted text-muted-foreground",
  },
};

const SEV_ORDER: Severity[] = ["high", "medium", "info"];

/** Serialize findings to plain text for copy/paste into a report. */
export function findingsToText(findings: Finding[]): string {
  return findings.map((f) => `[${SEV[f.severity].text}] ${f.message}`).join("\n");
}

/** Color-coded per-severity count chips, e.g. `3` (red) `1` (amber). */
function SeverityCounts({ findings }: { findings: Finding[] }) {
  const counts = SEV_ORDER.map((sev) => ({
    sev,
    n: findings.filter((f) => f.severity === sev).length,
  })).filter((c) => c.n > 0);
  return (
    <span className="flex items-center gap-1">
      {counts.map(({ sev, n }) => (
        <span
          key={sev}
          title={`${n} ${SEV[sev].label.toLowerCase()}`}
          className={cn(
            "inline-flex min-w-[1.15rem] justify-center rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums",
            SEV[sev].countClass,
          )}
        >
          {n}
        </span>
      ))}
    </span>
  );
}

/** A prioritized list of findings with a severity badge on each row. */
export function FindingList({
  findings,
  emptyLabel = "No red flags detected in the parsed input.",
}: {
  findings: Finding[];
  emptyLabel?: string;
}) {
  if (findings.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {findings.map((f, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <Badge className={cn("shrink-0", SEV[f.severity].className)}>
            {SEV[f.severity].label}
          </Badge>
          <span className="min-w-0 pt-0.5 text-foreground">{f.message}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * A titled "Findings" card: a collapsible list (collapsed by default) with
 * color-coded per-severity counts next to the title and a copy button. The
 * standard way to render a findings block across the triage tools.
 */
export function FindingsSection({
  findings,
  emptyLabel = "No red flags detected in the parsed input.",
  title = "Findings",
  defaultOpen = false,
}: {
  findings: Finding[];
  emptyLabel?: string;
  title?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const empty = findings.length === 0;

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3">
      <div className="flex min-h-6 items-center justify-between gap-2">
        {empty ? (
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h3>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="group flex items-center gap-2 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight
              className={cn(
                "size-3.5 text-muted-foreground transition-transform group-hover:text-foreground",
                open && "rotate-90",
              )}
            />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-foreground">
              {title}
            </h3>
            <SeverityCounts findings={findings} />
          </button>
        )}
        {!empty ? <CopyButton value={findingsToText(findings)} /> : null}
      </div>

      {empty ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : open ? (
        <FindingList findings={findings} />
      ) : null}
    </section>
  );
}
