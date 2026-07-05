import { useEffect, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import {
  decodePowerShell,
  encodeToBase64,
  type PsLayer,
  type OuterEncoding,
} from "./logic";

type Mode = "decode" | "encode";

const ENCODE_SAMPLE = `$user = $env:USERNAME
Write-Host "Hello, $user from $($env:COMPUTERNAME)"
Get-Date -Format o`;

const SAMPLE = "powershell -enc JAByAGEAdwAgAD0AIABbAFMAeQBzAHQAZQBtAC4AQwBvAG4AdgBlAHIAdABdADoAOgBGAHIAbwBtAEIAYQBzAGUANgA0AFMAdAByAGkAbgBnACgAJwBIADQAcwBJAEEAQQBBAEEAQQBBAEEAQQBDAG8AMQBSAHcAVwA2AGIAUQBCAFMAOAA4AHgAVwBqAGwAQQBOAEkAQgB0AFcAdABlAGsARwB5AEYAQQBmAGMAQwBMAFcAMgBrAFQASABOAHcAVQBMAFYAQgBsADcAcwByAFcARQBYADcAVAA0ADMAcwBsAHoALwBlAHcAVgB1AE8AVQBiAFoAMgArAHoATQB2AEgAbQBhADkAdwBGAEIARQBPAEMAZwBMAGMATgBRAHAAVgBVAFAASABiAGMAVwBMAEQARABEAFQAcAB1AGEARABOAFgAbAAvAGMAVQBCAEMAawBzAEcAdAB6AGYARAA2ADAARwBMAFYAagBwAEEAcgBOAHYAdQB4AEEATQB6AGcAMAB2AHEAZAB4AFMAdgBsADEAbQB4AFgAVwB4AFcAOAArAFgAQwBBAFIATABkAEMAcQBuACsAMgBRAFoAQgBrAFMAOAAyAHkAUwBwAFAAMQBzAHQANQB1AG4ASwBBAGQAUQA2AE0AZwA3ADEASAA0AGkAQwBXAGIAYQBvAHMAQwAxAFUAUgBuAHEAVAA2AC8ATwBuAG4AdQBpAE0AagBXAEsAcAA5AGYAcgBaAE0AcgBSAC8ARwBvAG0ATwBwAGwAUQBPAGsAZABsADYAMwB0ADQAUQBaAHYARgAxAE8AMQBjAGwASQBQAG8AZQBaAGsAYQBxAFMAbgBXAGoAQwBKADYAbABxAC8AVwByAEgAagB4AEoAdgBxAE4ASwBhAEYARQBzACsAbAAxAEgAMABTAEIAeQBmAGoAQwBIAEYAbgB1ACsASABxAFUAMwBWAFIAagBmADAAVgBzAFQARABTAFQAWgA4AGsANQBWAFIATgBPAHcAbABMAFIAdgBCADIAdgBnAE8AawBPAFUALwB5AEYAaQBwADEAZABEAEYAaQBMAGIAaQB1AGEARgB3AGgATwBGAFcANQAyAHkAawAyAG4AdQA5AHAAKwBoAFkAdAB2AFMALwBuAGEARwBlAFIARABEADUAQwBOADcAZAAxAFgAZABoACsAVQBGAHIATAByAHEAdABiAE0AbAAzAHIAcwA2AEwATgBpAFMAcQBBAHoAegAzAEMASwBrAHcASABEAHoAOABSAG0AZgByADQANABLADcAeQA4AGQASgBNAEoAMQBlAEkAMQB5AG0AMQB6AHMARQBMADMAQwBQAGsANQB0AG0ANQB4ADUATABYAEoAMAArAE4AegBPADYASQBtAHYAeABCADcAawAyAEgASwB5AGYAZgAxAEgARgBpAEwATQBDAFEAVQBLADIASQBsAFYATAB0AGUAOQBaAGEAcQBnAGEAKwBlAEMAcgBOAEoAYgB4AEIAUwB2AFIAMABnAFIAcABQAGUAawB0AGYAdwBGAGMAVABqAGYAdABoAGcASQBBAEEAQQA9AD0AJwApAAoAJABtAHMAIAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBJAE8ALgBNAGUAbQBvAHIAeQBTAHQAcgBlAGEAbQAoACwAJAByAGEAdwApAAoAJABnAHoAIAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBJAE8ALgBDAG8AbQBwAHIAZQBzAHMAaQBvAG4ALgBHAHoAaQBwAFMAdAByAGUAYQBtACgAJABtAHMALAAgAFsAUwB5AHMAdABlAG0ALgBJAE8ALgBDAG8AbQBwAHIAZQBzAHMAaQBvAG4ALgBDAG8AbQBwAHIAZQBzAHMAaQBvAG4ATQBvAGQAZQBdADoAOgBEAGUAYwBvAG0AcAByAGUAcwBzACkACgBJAEUAWAAgACgATgBlAHcALQBPAGIAagBlAGMAdAAgAFMAeQBzAHQAZQBtAC4ASQBPAC4AUwB0AHIAZQBhAG0AUgBlAGEAZABlAHIAKAAkAGcAegApACkALgBSAGUAYQBkAFQAbwBFAG4AZAAoACkA";

export default function PowerShellEncodedTool() {
  const [mode, setMode] = useState<Mode>("decode");
  const [input, setInput] = useState("");
  const [enc, setEnc] = useState<OuterEncoding>("auto");
  const [layers, setLayers] = useState<PsLayer[]>([]);
  const [error, setError] = useState("");

  // Decode is async (DecompressionStream); encode is synchronous.
  useEffect(() => {
    if (mode !== "decode" || input.trim() === "") {
      setLayers([]);
      setError("");
      return;
    }
    let cancelled = false;
    decodePowerShell(input, enc)
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
  }, [input, mode, enc]);

  const encoded = useMemo(() => (mode === "encode" ? encodeToBase64(input) : ""), [input, mode]);

  function switchMode(m: Mode) {
    setMode(m);
    setInput("");
    setEnc("auto");
  }

  return (
    <>
      <Segmented<Mode>
        aria-label="Mode"
        value={mode}
        onChange={switchMode}
        options={[
          { value: "decode", label: "Decode" },
          { value: "encode", label: "Encode" },
        ]}
      />

      {mode === "decode" ? (
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
      ) : null}

      {mode === "decode" ? (
        <Field
          label="Outer encoding"
          hint="`-EncodedCommand` is UTF-16LE. Auto detects it, but force one if a non-Latin (e.g. CJK) payload decodes as garbage."
        >
          <Segmented<OuterEncoding>
            aria-label="Outer encoding"
            value={enc}
            onChange={setEnc}
            options={[
              { value: "auto", label: "Auto" },
              { value: "utf-16le", label: "UTF-16LE" },
              { value: "utf-8", label: "UTF-8" },
            ]}
          />
        </Field>
      ) : null}

      {mode === "encode" ? (
        <Field
          label="PowerShell script"
          hint="Enter a script to build a -EncodedCommand — Base64 of UTF-16LE, the format `powershell -enc` takes."
          actions={
            <button
              onClick={() => setInput(ENCODE_SAMPLE)}
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
            placeholder={'Write-Host "hello"'}
            rows={6}
          />
        </Field>
      ) : null}

      {mode === "decode" ? (
        <>
          {input.trim() && error ? <ErrorNote>{error}</ErrorNote> : null}
          {layers.map((layer, i) => (
            <OutputArea
              key={i}
              value={layer.text}
              label={`Layer ${i + 1} — ${layer.label}`}
              filename={`layer-${i + 1}.ps1`}
              mono
            />
          ))}
        </>
      ) : encoded ? (
        <>
          <OutputArea
            value={encoded}
            label="Base64 (-EncodedCommand)"
            filename="encodedcommand.txt"
            mono
          />
          <OutputArea
            value={`powershell -EncodedCommand ${encoded}`}
            label="Command"
            filename="ps-command.txt"
            mono
          />
        </>
      ) : null}
    </>
  );
}
