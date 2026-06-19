import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, ErrorNote } from "@/components/tool/parts";
import {
  convertBase,
  toStandardBases,
  MIN_BASE,
  MAX_BASE,
  type StandardBases,
} from "./logic";

type FromChoice = "2" | "8" | "10" | "16" | "custom";

const FROM_OPTIONS = [
  { value: "2" as const, label: "Bin" },
  { value: "8" as const, label: "Oct" },
  { value: "10" as const, label: "Dec" },
  { value: "16" as const, label: "Hex" },
  { value: "custom" as const, label: "Custom" },
];

const STANDARD_ROWS: { key: keyof StandardBases; label: string }[] = [
  { key: "binary", label: "Binary (base 2)" },
  { key: "octal", label: "Octal (base 8)" },
  { key: "decimal", label: "Decimal (base 10)" },
  { key: "hex", label: "Hex (base 16)" },
];

export default function BaseConvertTool() {
  const [value, setValue] = useState("");
  const [fromChoice, setFromChoice] = useState<FromChoice>("10");
  const [customFrom, setCustomFrom] = useState("36");
  const [customTo, setCustomTo] = useState("36");

  const fromBase = fromChoice === "custom" ? Number(customFrom) : Number(fromChoice);
  const toBase = Number(customTo);

  const { bases, custom, error } = useMemo(() => {
    if (!value.trim()) {
      return { bases: null as StandardBases | null, custom: "", error: "" };
    }
    try {
      const b = toStandardBases(value, fromBase);
      let c = "";
      if (Number.isInteger(toBase) && toBase >= MIN_BASE && toBase <= MAX_BASE) {
        c = convertBase(value, fromBase, toBase);
      }
      return { bases: b, custom: c, error: "" };
    } catch (e) {
      return {
        bases: null as StandardBases | null,
        custom: "",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [value, fromBase, toBase]);

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From base" className="shrink-0">
          <Segmented<FromChoice>
            aria-label="Source base"
            value={fromChoice}
            onChange={setFromChoice}
            options={FROM_OPTIONS}
          />
        </Field>
        {fromChoice === "custom" && (
          <Field label="Source radix" className="w-32" hint={`${MIN_BASE}-${MAX_BASE}`}>
            <Input
              type="number"
              min={MIN_BASE}
              max={MAX_BASE}
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </Field>
        )}
      </div>

      <Field
        label="Value"
        hint={
          fromChoice === "custom"
            ? `Digits in base ${customFrom || "?"}`
            : `Digits in base ${fromChoice}`
        }
      >
        <Input
          autoFocus
          className="font-mono"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={fromChoice === "16" ? "ff" : "255"}
          spellCheck={false}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {STANDARD_ROWS.map(({ key, label }) => {
        const out = bases ? bases[key] : "";
        return (
          <Field
            key={key}
            label={label}
            actions={out ? <CopyButton value={out} /> : undefined}
          >
            <div className="min-h-[2.25rem] break-all rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-sm">
              {out || <span className="text-muted-foreground">—</span>}
            </div>
          </Field>
        );
      })}

      <Field
        label="Custom base output"
        hint={`${MIN_BASE}-${MAX_BASE}`}
        actions={custom ? <CopyButton value={custom} /> : undefined}
      >
        <div className="flex items-stretch gap-3">
          <Input
            type="number"
            min={MIN_BASE}
            max={MAX_BASE}
            className="w-24 shrink-0"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            aria-label="Target radix"
          />
          <div className="flex min-h-[2.25rem] flex-1 items-center break-all rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-sm">
            {custom || <span className="text-muted-foreground">—</span>}
          </div>
        </div>
      </Field>
    </>
  );
}
