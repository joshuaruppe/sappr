import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { encodeHtmlEntities, decodeHtmlEntities } from "./logic";

type Mode = "encode" | "decode";

export default function HtmlEntitiesTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [useNamedReferences, setUseNamedReferences] = useState(true);
  const [encodeEverything, setEncodeEverything] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input) return { output: "", error: "" };
    try {
      const out =
        mode === "encode"
          ? encodeHtmlEntities(input, { useNamedReferences, encodeEverything })
          : decodeHtmlEntities(input);
      return { output: out, error: "" };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, mode, useNamedReferences, encodeEverything]);

  function swap() {
    if (output) setInput(output);
    setMode((m) => (m === "encode" ? "decode" : "encode"));
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Mode>
          aria-label="Mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "encode", label: "Encode" },
            { value: "decode", label: "Decode" },
          ]}
        />
        {mode === "encode" && (
          <div className="flex flex-wrap items-center gap-4">
            <Switch
              checked={useNamedReferences}
              onChange={setUseNamedReferences}
              label="Named references"
              title="Use named entities like &amp; instead of numeric ones"
            />
            <Switch
              checked={encodeEverything}
              onChange={setEncodeEverything}
              label="Encode everything"
              title="Encode every character, not just unsafe ones"
            />
          </div>
        )}
      </div>

      <Field
        label={mode === "encode" ? "Text to encode" : "Entities to decode"}
        actions={
          <Button size="sm" variant="ghost" onClick={swap} disabled={!output}>
            <ArrowDownUp className="size-3.5" />
            Use output as input
          </Button>
        }
      >
        <Textarea
          autoFocus
          mono={mode === "decode"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "encode" ? "<a> & 'b'" : "&lt;a&gt; &amp; &#x27;b&#x27;"
          }
          rows={6}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <OutputArea
        value={output}
        label="Result"
        filename={mode === "encode" ? "encoded.txt" : "decoded.txt"}
        mono={mode === "encode"}
      />
    </>
  );
}
