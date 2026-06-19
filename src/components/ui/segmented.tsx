import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  /** Stretch to fill its container with equal-width segments. */
  fluid?: boolean;
  className?: string;
  "aria-label"?: string;
}

/** A compact segmented control for mutually-exclusive options (e.g. Encode/Decode). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  fluid = false,
  className,
  ...rest
}: SegmentedProps<T>) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const currentIndex = options.findIndex((o) => o.value === value);

  // Implement the ARIA radio-group keyboard model the roles promise: a single
  // Tab stop into the group (roving tabindex) and Arrow/Home/End to move.
  function selectAt(index: number) {
    const opt = options[index];
    if (!opt) return;
    onChange(opt.value);
    btnRefs.current[index]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (options.length === 0) return;
    const from = currentIndex < 0 ? 0 : currentIndex;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        selectAt((from + 1) % options.length);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        selectAt((from - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        selectAt(0);
        break;
      case "End":
        e.preventDefault();
        selectAt(options.length - 1);
        break;
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      onKeyDown={onKeyDown}
      className={cn(
        "items-center gap-1 rounded-lg border border-border bg-muted/50 p-1",
        fluid ? "flex w-full" : "inline-flex",
        className,
      )}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active || (currentIndex < 0 && i === 0) ? 0 : -1}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
              fluid && "flex-1",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
