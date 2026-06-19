import { useDeferredValue, useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { convert, DATA_FORMATS, type DataFormat } from "./logic";

const FORMAT_OPTIONS = DATA_FORMATS.map((f) => ({
  value: f,
  label: f.toUpperCase(),
}));

const EXT: Record<DataFormat, string> = {
  json: "json",
  yaml: "yaml",
  csv: "csv",
  toml: "toml",
};

export default function DataConvertTool() {
  const [from, setFrom] = useState<DataFormat>("json");
  const [to, setTo] = useState<DataFormat>("yaml");
  const [input, setInput] = useState("");
  const deferredInput = useDeferredValue(input);

  const { output, error } = useMemo(() => {
    if (!deferredInput.trim()) return { output: "", error: "" };
    try {
      return { output: convert(deferredInput, from, to), error: "" };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [deferredInput, from, to]);

  function swap() {
    setFrom(to);
    setTo(from);
    if (output) setInput(output);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Field label="From" className="flex-1">
          <Segmented<DataFormat>
            aria-label="Source format"
            value={from}
            onChange={setFrom}
            options={FORMAT_OPTIONS}
          />
        </Field>
        <Button
          size="icon"
          variant="ghost"
          onClick={swap}
          title="Swap formats and feed output back as input"
          className="mt-5 shrink-0"
        >
          <ArrowRightLeft className="size-4" />
        </Button>
        <Field label="To" className="flex-1">
          <Segmented<DataFormat>
            aria-label="Target format"
            value={to}
            onChange={setTo}
            options={FORMAT_OPTIONS}
          />
        </Field>
      </div>

      <Field label={`${from.toUpperCase()} input`}>
        <Textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={'{\n  "name": "sappr",\n  "tags": ["dev", "tools"]\n}'}
          rows={8}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <OutputArea
        value={output}
        label={`${to.toUpperCase()} output`}
        filename={`converted.${EXT[to]}`}
      />
    </>
  );
}
