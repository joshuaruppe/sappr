import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Render with a monospace font (default true — these are data fields). */
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, mono = true, spellCheck = false, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        spellCheck={spellCheck}
        className={cn(
          "flex min-h-[8rem] w-full resize-y rounded-md border border-input bg-card/60 px-3 py-2 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          mono && "font-mono text-[0.8125rem] leading-relaxed",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
