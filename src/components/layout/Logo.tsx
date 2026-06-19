import { cn } from "@/lib/utils";

/** The sappr wordmark: a small glyph block + monospace lowercase name. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        style={{ backgroundColor: "#6d4aff" }}
        className="relative grid size-7 place-items-center overflow-hidden rounded-md text-white shadow-sm"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {/* perimeter punch: an arrow driving through a gap in the wall line (the sapper's breach) */}
          <path d="M3 11h6.5" />
          <path d="M14.5 11H21" />
          <path d="M12 5v13.5" />
          <path d="M8.5 14.5L12 19l3.5-4.5" />
        </svg>
      </span>
      <span className="font-mono text-[0.95rem] font-semibold tracking-tight">
        sappr
      </span>
    </span>
  );
}
