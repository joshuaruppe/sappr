import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { vigenere, atbash, railFence } from "./logic";

type Cipher = "vigenere" | "atbash" | "railfence";
type Mode = "encode" | "decode";

export default function CipherTool() {
  const [cipher, setCipher] = useState<Cipher>("vigenere");
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [key, setKey] = useState("LEMON");
  const [rails, setRails] = useState("3");

  const { output, error } = useMemo(() => {
    if (!input) return { output: "", error: "" };
    try {
      const decode = mode === "decode";
      let out: string;
      if (cipher === "vigenere") out = vigenere(input, key, decode);
      else if (cipher === "atbash") out = atbash(input);
      else out = railFence(input, Number(rails), decode);
      return { output: out, error: "" };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, cipher, mode, key, rails]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Cipher>
          aria-label="Cipher"
          value={cipher}
          onChange={setCipher}
          options={[
            { value: "vigenere", label: "Vigenere" },
            { value: "atbash", label: "Atbash" },
            { value: "railfence", label: "Rail Fence" },
          ]}
        />
        {cipher !== "atbash" && (
          <Segmented<Mode>
            aria-label="Mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "encode", label: "Encode" },
              { value: "decode", label: "Decode" },
            ]}
          />
        )}
      </div>

      {cipher === "vigenere" && (
        <Field label="Key" hint="Only letters A-Z are used; other characters are ignored.">
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="LEMON"
          />
        </Field>
      )}

      {cipher === "railfence" && (
        <Field label="Rails" hint="Number of rails (2-10).">
          <Input
            type="number"
            min={2}
            max={10}
            value={rails}
            onChange={(e) => setRails(e.target.value)}
            placeholder="3"
          />
        </Field>
      )}

      <Field label={mode === "encode" ? "Plaintext" : "Ciphertext"}>
        <Textarea
          autoFocus
          mono={false}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ATTACK AT DAWN"
          rows={6}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <OutputArea
        value={output}
        label="Result"
        filename={mode === "encode" ? "ciphertext.txt" : "plaintext.txt"}
        mono={false}
      />
    </>
  );
}
