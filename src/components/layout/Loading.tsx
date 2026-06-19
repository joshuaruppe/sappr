import { Loader2 } from "lucide-react";

export function Loading({ label = "Loading tool…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
