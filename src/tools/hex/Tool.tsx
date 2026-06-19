import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { encodeHex, decodeHex, type HexDelimiter } from "./logic";

type Mode = "encode" | "decode";

export default function HexTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [delimiter, setDelimiter] = useState<HexDelimiter>("none");
  const [uppercase, setUppercase] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input) return { output: "", error: "" };
    try {
      const out =
        mode === "encode"
          ? encodeHex(input, { delimiter, uppercase })
          : decodeHex(input);
      return { output: out, error: "" };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, mode, delimiter, uppercase]);

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
            <Segmented<HexDelimiter>
              aria-label="Delimiter"
              size="sm"
              value={delimiter}
              onChange={setDelimiter}
              options={[
                { value: "none", label: "None" },
                { value: "space", label: "Space" },
                { value: "0x", label: "0x" },
                { value: "\\x", label: "\\x" },
                { value: "colon", label: "Colon" },
              ]}
            />
            <Switch
              checked={uppercase}
              onChange={setUppercase}
              label="Uppercase"
              title="Emit A-F instead of a-f"
            />
          </div>
        )}
      </div>

      <Field
        label={mode === "encode" ? "Text to encode" : "Hex to decode"}
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
          placeholder={mode === "encode" ? "Hello, world!" : "48 65 6c 6c 6f"}
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
