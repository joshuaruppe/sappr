import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { rot13, rot47, caesar } from "./logic";

type Preset = "rot13" | "rot47" | "custom";

export default function RotTool() {
  const [preset, setPreset] = useState<Preset>("rot13");
  const [input, setInput] = useState("");
  const [shift, setShift] = useState(3);
  const [decode, setDecode] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input) return { output: "", error: "" };
    try {
      let out: string;
      if (preset === "rot13") out = rot13(input);
      else if (preset === "rot47") out = rot47(input);
      else out = caesar(input, decode ? -shift : shift);
      return { output: out, error: "" };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, preset, shift, decode]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Preset>
          aria-label="Preset"
          value={preset}
          onChange={setPreset}
          options={[
            { value: "rot13", label: "ROT13" },
            { value: "rot47", label: "ROT47" },
            { value: "custom", label: "Custom" },
          ]}
        />
        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Shift</span>
              <input
                type="range"
                min={0}
                max={25}
                value={shift}
                onChange={(e) => setShift(Number(e.target.value))}
                aria-label="Shift amount"
                className="accent-primary"
              />
              <Input
                type="number"
                min={0}
                max={25}
                value={shift}
                onChange={(e) => {
                  const n = Math.trunc(Number(e.target.value));
                  setShift(Number.isFinite(n) ? Math.min(25, Math.max(0, n)) : 0);
                }}
                aria-label="Shift amount"
                className="w-16"
              />
            </label>
            <Switch
              checked={decode}
              onChange={setDecode}
              label="Decode"
              title="Shift letters backwards"
            />
          </div>
        )}
      </div>

      <Field label="Text">
        <Textarea
          autoFocus
          mono={false}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="The quick brown fox jumps over the lazy dog."
          rows={6}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <OutputArea value={output} label="Result" filename="rot.txt" mono={false} />
    </>
  );
}
