import { useDeferredValue, useMemo, useState } from "react";
import { ArrowDownUp, ArrowUpRight, ShieldAlert } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { useRouter } from "@/lib/router";
import { parseSecurityDescriptor } from "@/lib/security-descriptor";
import {
  BASES,
  type BaseKind,
  type HexDelimiter,
  encodeBase64,
  decodeBase64,
  decodeBase64Bytes,
  encodeBase32,
  decodeBase32,
  encodeBase58,
  decodeBase58,
  encodeHex,
  decodeHex,
} from "./logic";

type Mode = "encode" | "decode";

const SAMPLE = "admin:S3cr3tP@ssw0rd!";

export default function BaseTool() {
  const { navigate } = useRouter();
  const [base, setBase] = useState<BaseKind>("base64");
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");

  // Base64 options.
  const [urlSafe, setUrlSafe] = useState(false);
  const [padding, setPadding] = useState(true);
  const [strict, setStrict] = useState(false);
  // Base32 options.
  const [b32Padding, setB32Padding] = useState(true);
  const [b32Lower, setB32Lower] = useState(false);
  // Hex options.
  const [delimiter, setDelimiter] = useState<HexDelimiter>("none");
  const [uppercase, setUppercase] = useState(false);

  // Base58 is an O(n²) big-integer conversion (unlike linear base64/32/hex), so
  // defer the work to keep typing responsive on large input.
  const deferredInput = useDeferredValue(input);

  const { output, error, sdDetected } = useMemo(() => {
    if (!deferredInput) return { output: "", error: "", sdDetected: false };
    try {
      if (mode === "encode") {
        const out =
          base === "base64"
            ? encodeBase64(deferredInput, { urlSafe, padding })
            : base === "base32"
              ? encodeBase32(deferredInput, { padding: b32Padding, lowercase: b32Lower })
              : base === "base58"
                ? encodeBase58(deferredInput)
                : encodeHex(deferredInput, { delimiter, uppercase });
        return { output: out, error: "", sdDetected: false };
      }
      const out =
        base === "base64"
          ? decodeBase64(deferredInput, { strict })
          : base === "base32"
            ? decodeBase32(deferredInput)
            : base === "base58"
              ? decodeBase58(deferredInput)
              : decodeHex(deferredInput);
      // Recognize a Windows security descriptor in decoded Base64 bytes.
      const sdDetected =
        base === "base64" &&
        parseSecurityDescriptor(decodeBase64Bytes(deferredInput)) !== null;
      return { output: out, error: "", sdDetected };
    } catch (e) {
      return {
        output: "",
        error: e instanceof Error ? e.message : String(e),
        sdDetected: false,
      };
    }
  }, [
    deferredInput,
    base,
    mode,
    urlSafe,
    padding,
    strict,
    b32Padding,
    b32Lower,
    delimiter,
    uppercase,
  ]);

  const info = BASES.find((b) => b.value === base)!;

  function swap() {
    // Feed the current output back as input and flip the mode.
    if (output) setInput(output);
    setMode((m) => (m === "encode" ? "decode" : "encode"));
  }

  function openInSecurityDescriptor() {
    // Hand the pasted blob to the dedicated tool via the fragment (never sent
    // to a server, so the descriptor stays on this machine).
    navigate(`/t/security-descriptor?in=${encodeURIComponent(input)}`);
  }

  // Which option controls apply to the current base + mode.
  const showBase64Opts = base === "base64";
  const showBase32Opts = base === "base32" && mode === "encode";
  const showHexOpts = base === "hex" && mode === "encode";
  const hasOptions = showBase64Opts || showBase32Opts || showHexOpts;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<BaseKind>
          aria-label="Format"
          value={base}
          onChange={setBase}
          options={BASES.map((b) => ({ value: b.value, label: b.label }))}
        />
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

      {hasOptions && (
        <div className="flex flex-wrap items-center gap-4">
          {showBase64Opts && (
            <>
              <Switch
                checked={urlSafe}
                onChange={setUrlSafe}
                label="URL-safe"
                title="Use the -_ alphabet instead of +/"
              />
              {mode === "encode" ? (
                <Switch checked={padding} onChange={setPadding} label="Padding" />
              ) : (
                <Switch
                  checked={strict}
                  onChange={setStrict}
                  label="Strict UTF-8"
                  title="Fail on invalid UTF-8 instead of inserting replacement characters"
                />
              )}
            </>
          )}
          {showBase32Opts && (
            <>
              <Switch checked={b32Padding} onChange={setB32Padding} label="Padding" />
              <Switch
                checked={b32Lower}
                onChange={setB32Lower}
                label="Lowercase"
                title="Emit a lowercase alphabet"
              />
            </>
          )}
          {showHexOpts && (
            <>
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
            </>
          )}
        </div>
      )}

      <Field
        label={mode === "encode" ? "Text to encode" : `${info.label} to decode`}
        actions={
          <>
            <button
              onClick={() => setInput(SAMPLE)}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Load sample
            </button>
            <Button size="sm" variant="ghost" onClick={swap} disabled={!output}>
              <ArrowDownUp className="size-3.5" />
              Use output as input
            </Button>
          </>
        }
      >
        <Textarea
          autoFocus
          mono={mode === "decode"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === "encode" ? "Hello, world!" : info.decodePlaceholder}
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

      {sdDetected && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
          <ShieldAlert className="size-4 shrink-0 text-primary" />
          <span className="min-w-0">
            These bytes look like a Windows{" "}
            <span className="font-medium text-foreground">security descriptor</span>.
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            onClick={openInSecurityDescriptor}
          >
            Open in Security Descriptor
            <ArrowUpRight className="size-3.5" />
          </Button>
        </div>
      )}
    </>
  );
}
