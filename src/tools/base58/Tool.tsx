import { useDeferredValue, useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { encodeBase58, decodeBase58 } from "./logic";

type Mode = "encode" | "decode";

export default function Base58Tool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  // base58 is an O(n²) big-integer conversion (unlike linear base64/hex), so
  // defer the work to keep typing responsive on large input.
  const deferredInput = useDeferredValue(input);

  const { output, error } = useMemo(() => {
    if (!deferredInput) return { output: "", error: "" };
    try {
      const out =
        mode === "encode"
          ? encodeBase58(deferredInput)
          : decodeBase58(deferredInput);
      return { output: out, error: "" };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [deferredInput, mode]);

  function swap() {
    // Feed the current output back as input and flip the mode.
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
      </div>

      <Field
        label={mode === "encode" ? "Text to encode" : "Base58 to decode"}
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
          placeholder={mode === "encode" ? "Hello, world!" : "Cn8eVZg"}
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
