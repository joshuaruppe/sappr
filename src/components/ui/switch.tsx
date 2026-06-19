import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  title?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/** A compact toggle for boolean tool options. */
export function Switch({
  checked,
  onChange,
  label,
  title,
  disabled,
  className,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <label
      title={title}
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2 text-sm",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-input",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[1.125rem]" : "translate-x-0.5",
          )}
        />
      </button>
      {label ? <span className="text-muted-foreground">{label}</span> : null}
    </label>
  );
}
