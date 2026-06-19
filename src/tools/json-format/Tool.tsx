import { useDeferredValue, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { formatJson, type JsonIndent } from "./logic";

type Action = "beautify" | "minify";

export default function JsonFormatTool() {
  const [action, setAction] = useState<Action>("beautify");
  const [indent, setIndent] = useState<JsonIndent>("2");
  const [sortKeys, setSortKeys] = useState(false);
  const [input, setInput] = useState("");
  const deferredInput = useDeferredValue(input);

  const { output, error } = useMemo(() => {
    if (!deferredInput.trim()) return { output: "", error: "" };
    try {
      const out = formatJson(deferredInput, {
        minify: action === "minify",
        indent,
        sortKeys,
      });
      return { output: out, error: "" };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [deferredInput, action, indent, sortKeys]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Action>
          aria-label="Action"
          value={action}
          onChange={setAction}
          options={[
            { value: "beautify", label: "Beautify" },
            { value: "minify", label: "Minify" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-4">
          {action === "beautify" && (
            <Segmented<JsonIndent>
              aria-label="Indent"
              size="sm"
              value={indent}
              onChange={setIndent}
              options={[
                { value: "2", label: "2" },
                { value: "4", label: "4" },
                { value: "tab", label: "Tab" },
              ]}
            />
          )}
          <Switch
            checked={sortKeys}
            onChange={setSortKeys}
            label="Sort keys"
            title="Recursively sort object keys alphabetically"
          />
        </div>
      </div>

      <Field label="JSON input">
        <Textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={'{ "hello": "world", "items": [1, 2, 3] }'}
          rows={8}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <OutputArea value={output} label="Result" filename="formatted.json" />
    </>
  );
}
