import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { computeHmac, decodeKey } from "./logic";
import type { HmacAlgo, KeyEncoding } from "./logic";

export default function HmacTool() {
  const [message, setMessage] = useState("");
  const [key, setKey] = useState("");
  const [algo, setAlgo] = useState<HmacAlgo>("sha256");
  const [keyAs, setKeyAs] = useState<KeyEncoding>("utf-8");

  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!message && !key) {
      setOutput("");
      setError("");
      return;
    }
    let cancelled = false;
    try {
      const keyBytes = decodeKey(key, keyAs);
      computeHmac(message, keyBytes, algo)
        .then((hex) => {
          if (cancelled) return;
          setOutput(hex);
          setError("");
        })
        .catch((e) => {
          if (cancelled) return;
          setOutput("");
          setError(e instanceof Error ? e.message : String(e));
        });
    } catch (e) {
      setOutput("");
      setError(e instanceof Error ? e.message : String(e));
    }
    return () => {
      cancelled = true;
    };
  }, [message, key, algo, keyAs]);

  return (
    <>
      <Field label="Algorithm">
        <Segmented<HmacAlgo>
          aria-label="Hash algorithm"
          value={algo}
          onChange={setAlgo}
          options={[
            { value: "md5", label: "MD5" },
            { value: "sha1", label: "SHA-1" },
            { value: "sha256", label: "SHA-256" },
            { value: "sha512", label: "SHA-512" },
          ]}
        />
      </Field>

      <Field label="Message">
        <Textarea
          autoFocus
          mono={false}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="The quick brown fox jumps over the lazy dog"
          rows={5}
        />
      </Field>

      <Field
        label="Key"
        actions={
          <Segmented<KeyEncoding>
            aria-label="Key encoding"
            size="sm"
            value={keyAs}
            onChange={setKeyAs}
            options={[
              { value: "utf-8", label: "UTF-8" },
              { value: "hex", label: "Hex" },
              { value: "base64", label: "Base64" },
            ]}
          />
        }
      >
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="secret key"
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <OutputArea
        value={output}
        label="HMAC (hex)"
        filename="hmac.txt"
        rows={3}
      />
    </>
  );
}
