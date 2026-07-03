import { Badge } from "@/components/ui/badge";
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

const SEV: Record<Severity, { label: string; className: string }> = {
  high: { label: "High", className: "bg-destructive/15 text-destructive border-transparent" },
  medium: { label: "Med", className: "bg-warning/15 text-warning border-transparent" },
  info: { label: "Info", className: "bg-muted text-muted-foreground border-transparent" },
};

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
