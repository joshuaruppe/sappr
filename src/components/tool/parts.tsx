import {
  cloneElement,
  isValidElement,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { AlertTriangle, Download, Upload } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";
import { cn, downloadBlob, formatBytes } from "@/lib/utils";

/** A labeled section with optional hint and right-aligned actions. */
export function Field({
  label,
  hint,
  actions,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const fieldId = useId();
  // Associate the label with a single child control (input/textarea) so screen
  // readers announce its name. A no-op for non-labelable children.
  const child = isValidElement(children)
    ? (children as ReactElement<{ id?: string }>)
    : null;
  const controlId = child ? child.props.id ?? fieldId : undefined;
  const labeledChild =
    child && child.props.id == null ? cloneElement(child, { id: controlId }) : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || actions) && (
        <div className="flex min-h-6 items-center justify-between gap-2">
          {label ? (
            <label
              htmlFor={controlId}
              className="text-xs font-medium text-muted-foreground"
            >
              {label}
            </label>
          ) : (
            <span />
          )}
          {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
        </div>
      )}
      {labeledChild}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** A read-only output block with a copy/download toolbar and byte count. */
export function OutputArea({
  value,
  label = "Output",
  filename = "sappr-output.txt",
  placeholder = "Output will appear here…",
  mono = true,
  className,
  rows = 6,
}: {
  value: string;
  label?: ReactNode;
  filename?: string;
  placeholder?: string;
  mono?: boolean;
  className?: string;
  rows?: number;
}) {
  const bytes = useMemo(() => new Blob([value]).size, [value]);
  return (
    <Field
      label={label}
      actions={
        <>
          <span className="mr-1 text-[0.7rem] tabular-nums text-muted-foreground">
            {value ? `${value.length.toLocaleString()} chars · ${formatBytes(bytes)}` : ""}
          </span>
          <Button
            size="icon"
            variant="ghost"
            title="Download"
            disabled={!value}
            onClick={() => downloadBlob(value, filename, "text/plain")}
          >
            <Download className="size-4" />
          </Button>
          <CopyButton value={value} />
        </>
      }
    >
      <textarea
        readOnly
        rows={rows}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        className={cn(
          "w-full resize-y rounded-md border border-input bg-muted/40 px-3 py-2 text-sm shadow-inner",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          mono && "font-mono text-[0.8125rem] leading-relaxed",
          className,
        )}
      />
    </Field>
  );
}

/** A destructive-styled inline error note. */
export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

/** A drag-and-drop + click file picker. Calls back with the chosen File. */
export function FileDrop({
  onFile,
  accept,
  hint = "Drop a file here, or click to browse",
  className,
}: {
  onFile: (file: File) => void;
  accept?: string;
  hint?: ReactNode;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Choose a file, or drop one here"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        dragging
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground",
        className,
      )}
    >
      <Upload className="size-5" />
      <span className="text-sm">{hint}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
