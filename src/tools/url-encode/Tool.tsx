import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { encodeUrl, decodeUrl, type UrlScope } from "./logic";

type Mode = "encode" | "decode";

export default function UrlEncodeTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<UrlScope>("component");
  const [plus, setPlus] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input) return { output: "", error: "" };
    try {
      const out =
        mode === "encode"
          ? encodeUrl(input, { scope, plus })
          : decodeUrl(input, { scope, plus });
      return { output: out, error: "" };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, mode, scope, plus]);

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
        <div className="flex flex-wrap items-center gap-4">
          <Segmented<UrlScope>
            aria-label="Scope"
            size="sm"
            value={scope}
            onChange={setScope}
            options={[
              { value: "component", label: "Component" },
              { value: "full", label: "Full URI" },
            ]}
          />
          <Switch
            checked={plus}
            onChange={setPlus}
            label="Plus for spaces (form)"
            title="Encode spaces as + and treat + as space on decode (application/x-www-form-urlencoded)"
          />
        </div>
      </div>

      <Field
        label={mode === "encode" ? "Text to encode" : "URL to decode"}
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
            mode === "encode"
              ? "name=John Doe & city=São Paulo"
              : "name%3DJohn%20Doe"
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
