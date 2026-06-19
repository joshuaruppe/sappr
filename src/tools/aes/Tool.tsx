import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import {
  encryptAes,
  decryptAes,
  type AesCipher,
  type AesKeyType,
} from "./logic";

type Mode = "encrypt" | "decrypt";

export default function AesTool() {
  const [mode, setMode] = useState<Mode>("encrypt");
  const [cipher, setCipher] = useState<AesCipher>("AES-GCM");
  const [keyType, setKeyType] = useState<AesKeyType>("passphrase");
  const [keyValue, setKeyValue] = useState("");
  const [input, setInput] = useState("");

  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Token guards against out-of-order async results clobbering newer ones.
  const runId = useRef(0);

  useEffect(() => {
    const id = ++runId.current;

    if (!input || !keyValue) {
      setOutput("");
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    const handle = setTimeout(() => {
      const opts = { cipher, keyType, key: keyValue };
      const work =
        mode === "encrypt"
          ? encryptAes(input, opts)
          : decryptAes(input, opts);
      work
        .then((out) => {
          if (id !== runId.current) return;
          setOutput(out);
          setError("");
        })
        .catch((e: unknown) => {
          if (id !== runId.current) return;
          setOutput("");
          setError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          if (id === runId.current) setLoading(false);
        });
    }, 250);

    return () => clearTimeout(handle);
  }, [mode, cipher, keyType, keyValue, input]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Mode>
          aria-label="Mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "encrypt", label: "Encrypt" },
            { value: "decrypt", label: "Decrypt" },
          ]}
        />
        <Segmented<AesCipher>
          aria-label="Cipher"
          value={cipher}
          onChange={setCipher}
          options={[
            { value: "AES-GCM", label: "AES-GCM" },
            { value: "AES-CBC", label: "AES-CBC" },
          ]}
        />
      </div>

      <Field
        label="Key"
        hint={
          keyType === "passphrase"
            ? "Derived with PBKDF2 (SHA-256, 200,000 iterations, random 16-byte salt)."
            : "Raw key bytes: must be 16, 24, or 32 bytes after decoding."
        }
        actions={
          <Segmented<AesKeyType>
            size="sm"
            aria-label="Key type"
            value={keyType}
            onChange={setKeyType}
            options={[
              { value: "passphrase", label: "Passphrase" },
              { value: "hex", label: "Hex" },
              { value: "base64", label: "Base64" },
            ]}
          />
        }
      >
        <Input
          type={keyType === "passphrase" ? "password" : "text"}
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          placeholder={
            keyType === "passphrase"
              ? "correct horse battery staple"
              : keyType === "hex"
                ? "00112233445566778899aabbccddeeff"
                : "base64-encoded key bytes"
          }
        />
      </Field>

      <Field
        label={mode === "encrypt" ? "Plaintext" : "Ciphertext (Base64)"}
      >
        <Textarea
          autoFocus
          mono={mode === "decrypt"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "encrypt"
              ? "Secret message…"
              : "Paste the Base64 output from Encrypt…"
          }
          rows={6}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <OutputArea
        value={output}
        label={
          loading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" />
              Working…
            </span>
          ) : mode === "encrypt" ? (
            "Ciphertext (Base64)"
          ) : (
            "Plaintext"
          )
        }
        filename={mode === "encrypt" ? "ciphertext.txt" : "plaintext.txt"}
        mono={mode === "encrypt"}
      />
    </>
  );
}
