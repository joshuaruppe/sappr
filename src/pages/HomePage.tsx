import { toolsByCategory, toolCount } from "@/registry/registry";
import { LEGEND_EXECUTIONS } from "@/registry/execution";
import { APP_TAGLINE } from "@/lib/version";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function HomePage() {
  const groups = toolsByCategory;
  const modKey =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)
      ? "⌘"
      : "Ctrl";

  return (
    <div className="animate-in-fade mx-auto w-full max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      {/* Hero */}
      <section className="mb-8 text-center">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="font-mono">sappr</span>
          <span className="text-muted-foreground"> · {APP_TAGLINE}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
          A fast, modern, self-hostable toolkit for encoding, hashing, QR, regex,
          code formatting and more.{" "}
          <Badge variant="success">{toolCount}</Badge> tools and counting.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Search with{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-foreground">
            {modKey}
          </kbd>
          <span className="px-0.5">+</span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-foreground">
            K
          </kbd>
          , or pick a tool from the menus above ↑
        </p>
      </section>

      {/* Legend / key for the execution dots */}
      <section className="mb-6 rounded-xl border border-border bg-card/50 p-4 sm:p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Where each tool runs
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {LEGEND_EXECUTIONS.map((e) => (
            <div key={e.id} className="flex items-start gap-2.5">
              <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", e.dotClass)} />
              <div>
                <div className={cn("text-sm font-medium", e.textClass)}>{e.label}</div>
                <p className="text-xs text-muted-foreground">{e.description}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          Today everything is{" "}
          <span className="font-medium text-success">in your browser</span>. The
          other indicators arrive with self-hosted and API-backed tools on the
          roadmap.
        </p>
      </section>

      {/* High-level breakdown: what each menu contains */}
      <section>
        <div className="rounded-xl border border-border bg-card/40 p-4 sm:p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What&apos;s in each menu
          </h2>
          <div className="flex flex-col divide-y divide-border/60">
            {groups.map(({ category }) => (
              <div
                key={category.id}
                className="flex gap-3.5 py-5 first:pt-0 last:pb-0"
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background/50 text-primary">
                  <category.icon className="size-4.5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{category.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
