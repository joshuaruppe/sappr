import type { ReactNode } from "react";
import type { ToolMeta } from "@/registry/types";
import { executionOf } from "@/registry/execution";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Standard chrome for a tool page: icon, title, description and status badges,
 * with the tool's own UI rendered as children. Keeps every tool visually
 * consistent and makes authoring a new tool trivial.
 */
export function ToolShell({
  meta,
  children,
  actions,
}: {
  meta: ToolMeta;
  children: ReactNode;
  /** Optional header-right actions (e.g. a "Share" button). */
  actions?: ReactNode;
}) {
  const Icon = meta.icon;
  const exec = executionOf(meta.execution);
  const status = meta.status ?? "stable";

  return (
    <div className="animate-in-fade mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card/70 text-primary shadow-sm">
            <Icon className="size-5.5" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{meta.title}</h1>
              {status !== "stable" && (
                <Badge variant={status === "beta" ? "primary" : "warning"}>
                  {status}
                </Badge>
              )}
              <span
                role="img"
                aria-label={exec.label}
                title={`${exec.label} - ${exec.description}`}
                className={cn(
                  "size-2 shrink-0 rounded-full ring-4 ring-current/15",
                  exec.dotClass,
                  exec.textClass,
                )}
              />
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {meta.description}
            </p>
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>

      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}
