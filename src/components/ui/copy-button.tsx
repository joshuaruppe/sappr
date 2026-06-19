import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { copyToClipboard, cn } from "@/lib/utils";

export interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  value: string;
  /** Optional label rendered next to the icon. */
  label?: string;
}

export function CopyButton({ value, label, className, size = "sm", variant = "ghost", ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  }

  return (
    <Button
      onClick={handleCopy}
      size={label ? size : "icon"}
      variant={variant}
      disabled={!value}
      title="Copy to clipboard"
      className={cn(className)}
      {...props}
    >
      {copied ? (
        <Check className="size-4 text-success" />
      ) : (
        <Copy className="size-4" />
      )}
      {label ? <span>{copied ? "Copied" : label}</span> : null}
    </Button>
  );
}
