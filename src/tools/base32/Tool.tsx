import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { encodeBase32, decodeBase32 } from "./logic";

type Mode = "encode" | "decode";

export default function Base32Tool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [padding, setPadding] = useState(true);
  const [lowercase, setLowercase] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input) return { output: "", error: "" };
    try {
      const out =
        mode === "encode"
          ? encodeBase32(input, { padding, lowercase })
          : decodeBase32(input);
      return { output: out, error: "" };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, mode, padding, lowercase]);

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
            <Switch checked={padding} onChange={setPadding} label="Padding" />
            <Switch
              checked={lowercase}
              onChange={setLowercase}
              label="Lowercase"
              title="Emit a lowercase alphabet"
            />
          </div>
        )}
      </div>

      <Field
        label={mode === "encode" ? "Text to encode" : "Base32 to decode"}
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
          placeholder={mode === "encode" ? "Hello, world!" : "NBSWY3DP"}
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
