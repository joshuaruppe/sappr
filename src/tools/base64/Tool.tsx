import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { SecurityDescriptorView } from "@/components/tool/security-descriptor-view";
import {
  parseSecurityDescriptor,
  type SecurityDescriptor,
} from "@/lib/security-descriptor";
import { encodeBase64, decodeBase64, decodeBase64Bytes } from "./logic";

type Mode = "encode" | "decode";

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [padding, setPadding] = useState(true);
  const [strict, setStrict] = useState(false);

  const { output, error, sd } = useMemo(() => {
    const empty = { output: "", error: "", sd: null as SecurityDescriptor | null };
    if (!input) return empty;
    try {
      if (mode === "encode") {
        return { output: encodeBase64(input, { urlSafe, padding }), error: "", sd: null };
      }
      const out = decodeBase64(input, { strict });
      // Recognize a Windows security descriptor in the decoded bytes.
      const sd = parseSecurityDescriptor(decodeBase64Bytes(input));
      return { output: out, error: "", sd };
    } catch (e) {
      return { ...empty, error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, mode, urlSafe, padding, strict]);

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
        <div className="flex flex-wrap items-center gap-4">
          <Switch
            checked={urlSafe}
            onChange={setUrlSafe}
            label="URL-safe"
            title="Use the -_ alphabet instead of +/"
          />
          {mode === "encode" && (
            <Switch checked={padding} onChange={setPadding} label="Padding" />
          )}
          {mode === "decode" && (
            <Switch
              checked={strict}
              onChange={setStrict}
              label="Strict UTF-8"
              title="Fail on invalid UTF-8 instead of inserting replacement characters"
            />
          )}
        </div>
      </div>

      <Field
        label={mode === "encode" ? "Text to encode" : "Base64 to decode"}
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
            mode === "encode" ? "Hello, world!" : "SGVsbG8sIHdvcmxkIQ=="
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

      {sd ? <SecurityDescriptorView sd={sd} /> : null}
    </>
  );
}
