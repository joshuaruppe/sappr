import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import {
  xorCipher,
  parseBytes,
  formatBytesAs,
  bruteForceSingleByte,
  type ByteFormat,
} from "./logic";

type Mode = "cipher" | "brute";

const FORMAT_OPTIONS: { value: ByteFormat; label: string }[] = [
  { value: "utf8", label: "UTF-8" },
  { value: "hex", label: "Hex" },
  { value: "base64", label: "Base64" },
];

const BRUTE_OPTIONS: { value: ByteFormat; label: string }[] = [
  { value: "hex", label: "Hex" },
  { value: "base64", label: "Base64" },
];

const TOP_N = 16;

export default function XorTool() {
  const [mode, setMode] = useState<Mode>("cipher");

  // Cipher mode state.
  const [input, setInput] = useState("");
  const [keyText, setKeyText] = useState("");
  const [inputFormat, setInputFormat] = useState<ByteFormat>("utf8");
  const [keyFormat, setKeyFormat] = useState<ByteFormat>("utf8");
  const [outputFormat, setOutputFormat] = useState<ByteFormat>("hex");

  // Brute-force mode state.
  const [bruteInput, setBruteInput] = useState("");
  const [bruteFormat, setBruteFormat] = useState<ByteFormat>("hex");

  const cipher = useMemo(() => {
    if (!input || !keyText) return { output: "", error: "" };
    try {
      const inputBytes = parseBytes(input, inputFormat);
      const keyBytes = parseBytes(keyText, keyFormat);
      const out = xorCipher(inputBytes, keyBytes);
      return { output: formatBytesAs(out, outputFormat), error: "" };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, keyText, inputFormat, keyFormat, outputFormat]);

  const brute = useMemo(() => {
    if (!bruteInput) return { candidates: [], error: "" };
    try {
      const bytes = parseBytes(bruteInput, bruteFormat);
      return {
        candidates: bruteForceSingleByte(bytes, TOP_N),
        error: "",
      };
    } catch (e) {
      return {
        candidates: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [bruteInput, bruteFormat]);

  return (
    <>
      <Segmented<Mode>
        aria-label="Mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: "cipher", label: "Cipher" },
          { value: "brute", label: "Brute-force" },
        ]}
      />

      {mode === "cipher" ? (
        <>
          <Field
            label="Input"
            actions={
              <Segmented<ByteFormat>
                aria-label="Input format"
                size="sm"
                value={inputFormat}
                onChange={setInputFormat}
                options={FORMAT_OPTIONS}
              />
            }
          >
            <Textarea
              autoFocus
              mono={inputFormat !== "utf8"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Attack at dawn"
              rows={6}
            />
          </Field>

          <Field
            label="Key"
            actions={
              <Segmented<ByteFormat>
                aria-label="Key format"
                size="sm"
                value={keyFormat}
                onChange={setKeyFormat}
                options={FORMAT_OPTIONS}
              />
            }
          >
            <Input
              value={keyText}
              onChange={(e) => setKeyText(e.target.value)}
              placeholder="secret"
              className={keyFormat === "utf8" ? undefined : "font-mono"}
            />
          </Field>

          <Field label="Output format">
            <Segmented<ByteFormat>
              aria-label="Output format"
              value={outputFormat}
              onChange={setOutputFormat}
              options={FORMAT_OPTIONS}
            />
          </Field>

          {cipher.error ? <ErrorNote>{cipher.error}</ErrorNote> : null}

          <OutputArea
            value={cipher.output}
            label="Result"
            filename="xor-output.txt"
            mono={outputFormat !== "utf8"}
          />
        </>
      ) : (
        <>
          <Field
            label="Ciphertext"
            hint="Single-byte XOR brute force tries all 256 keys and ranks by printable-ASCII ratio."
            actions={
              <Segmented<ByteFormat>
                aria-label="Input format"
                size="sm"
                value={bruteFormat}
                onChange={setBruteFormat}
                options={BRUTE_OPTIONS}
              />
            }
          >
            <Textarea
              autoFocus
              mono
              value={bruteInput}
              onChange={(e) => setBruteInput(e.target.value)}
              placeholder="1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736"
              rows={4}
            />
          </Field>

          {brute.error ? <ErrorNote>{brute.error}</ErrorNote> : null}

          {brute.candidates.length > 0 ? (
            <Field label="Top candidates">
              <ul className="flex flex-col gap-1.5">
                {brute.candidates.map((c) => (
                  <li
                    key={c.key}
                    className="flex items-center gap-3 rounded-md border border-input bg-muted/40 px-3 py-2"
                  >
                    <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                      0x{c.key.toString(16).padStart(2, "0")}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {Math.round(c.printableRatio * 100)}%
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[0.8125rem]">
                      {c.output || " "}
                    </span>
                    <CopyButton value={c.output} />
                  </li>
                ))}
              </ul>
            </Field>
          ) : null}
        </>
      )}
    </>
  );
}
