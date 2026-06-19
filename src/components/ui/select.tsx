import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  /** Flat options. */
  options?: SelectOption[];
  /** Grouped options (rendered as <optgroup>s). */
  groups?: SelectOptionGroup[];
}

/** A styled native <select> — keeps the OS dropdown (offline, accessible). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, groups, ...props }, ref) => {
    return (
      <div className="relative inline-flex">
        <select
          ref={ref}
          className={cn(
            "h-8 w-full appearance-none rounded-md border border-input bg-card/60 pl-3 pr-8 text-sm shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        >
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          {groups?.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  },
);
Select.displayName = "Select";
