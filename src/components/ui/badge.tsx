import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "outline" | "primary" | "success" | "warning" | "muted";

const VARIANTS: Record<BadgeVariant, string> = {
  default: "border-transparent bg-secondary text-secondary-foreground",
  primary: "border-transparent bg-primary/15 text-primary",
  outline: "border-border text-foreground",
  success: "border-transparent bg-success/15 text-success",
  warning: "border-transparent bg-warning/15 text-warning",
  muted: "border-transparent bg-muted text-muted-foreground",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
