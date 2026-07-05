import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { decodePowerShell, type PsLayer } from "./logic";

const SAMPLE = "powershell -enc dwBoAG8AYQBtAGkA";

export default function PowerShellEncodedTool() {
  const [input, setInput] = useState("");
  const [layers, setLayers] = useState<PsLayer[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (input.trim() === "") {
      setLayers([]);
      setError("");
      return;
    }
    let cancelled = false;
    decodePowerShell(input)
      .then((r) => {
        if (!cancelled) {
          setLayers(r.layers);
          setError(r.error);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLayers([]);
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  return (
    <>
      <Field
        label="Encoded command"
        hint="Paste `powershell -enc <base64>`, or the raw Base64. Nested Base64 + Deflate/Gzip layers are unwrapped automatically."
        actions={
          <button
            onClick={() => setInput(SAMPLE)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Load sample
          </button>
        }
      >
        <Textarea
          autoFocus
          mono
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="powershell -enc JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAt..."
          rows={5}
        />
      </Field>

      {input.trim() && error ? <ErrorNote>{error}</ErrorNote> : null}

      {layers.map((layer, i) => (
        <OutputArea
          key={i}
          value={layer.text}
          label={`Layer ${i + 1} — ${layer.label}`}
          filename={`layer-${i + 1}.ps1`}
          mono
          rows={i === layers.length - 1 ? 8 : 4}
        />
      ))}
    </>
  );
}
