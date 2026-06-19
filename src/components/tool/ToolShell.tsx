import type { ReactNode } from "react";
import type { ToolMeta } from "@/registry/types";
import { CATEGORIES } from "@/registry/categories";
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
  const category = CATEGORIES[meta.category];
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
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {meta.description}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <category.icon className="size-3.5" />
                {category.label}
              </span>
              <span aria-hidden className="text-border">
                •
              </span>
              <span
                className={cn("inline-flex items-center gap-1.5", exec.textClass)}
                title={exec.description}
              >
                <span className={cn("size-1.5 rounded-full", exec.dotClass)} />
                {exec.label}
              </span>
            </div>
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>

      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}
