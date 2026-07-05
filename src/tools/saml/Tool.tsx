import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Badge } from "@/components/ui/badge";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { decodeSaml, encodeSaml, type SamlDecodeResult, type SamlEncodeResult } from "./logic";

type Mode = "decode" | "encode";

// A DEFLATE + Base64 SAML AuthnRequest (HTTP-Redirect binding).
const DECODE_SAMPLE = "fZFbS8NAEIX/yjLvSTYRLyxJILaIgarBRh98kW0ytQt7iTsbrf9eTBVb0L7OnMP5Zk5O0uhBVGPY2Ht8HZEC2xptSUyLAkZvhZOkSFhpkEToxLK6WYgs5mLwLrjOadizHHdIIvRBOQusnhfwfLE+kdkq7YA9oiflbAFZzIHVRCPWloK0oYCMZ2cRP4/4aZtmgnPB+ROwOVJQVobJtQlhIJEkqh9i3EozaIw7ZxIiB6z55rxUtlf25Tjiaicicd22TdTcLVtg1Q/2zFkaDfol+jfV4cP94jeaDpNlR1DmXy8R0zW+/FuYJ/uafNfHrTRYzxunVffBrpw3MvxPncbpNFF9tJ6kAo1Uuup7j0TAKq3d+8yjDFhA8CNCUu5SD4svPwE=";

const ENCODE_SAMPLE = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_id123" Version="2.0" IssueInstant="2026-07-05T12:00:00Z" Destination="https://idp.example.com/sso" AssertionConsumerServiceURL="https://sp.example.com/acs">
  <saml:Issuer>https://sp.example.com</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>`;

export default function SamlTool() {
  const [mode, setMode] = useState<Mode>("decode");
  const [input, setInput] = useState("");
  const [decoded, setDecoded] = useState<SamlDecodeResult | null>(null);
  const [encoded, setEncoded] = useState<SamlEncodeResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (input.trim() === "") {
      setDecoded(null);
      setEncoded(null);
      setError("");
      return;
    }
    let cancelled = false;
    (mode === "decode" ? decodeSaml(input) : encodeSaml(input))
      .then((r) => {
        if (cancelled) return;
        setError(r.error);
        if (mode === "decode") {
          setDecoded(r as SamlDecodeResult);
          setEncoded(null);
        } else {
          setEncoded(r as SamlEncodeResult);
          setDecoded(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [input, mode]);

  function switchMode(m: Mode) {
    setMode(m);
    setInput("");
  }

  const sample = mode === "decode" ? DECODE_SAMPLE : ENCODE_SAMPLE;

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

      <Field
        label={mode === "decode" ? "SAML message" : "XML"}
        hint={
          mode === "decode"
            ? "Paste a SAMLRequest/SAMLResponse (Base64, optionally URL-encoded). The DEFLATE and POST bindings are auto-detected."
            : "Paste SAML XML to encode into both bindings."
        }
        actions={
          <button
            onClick={() => setInput(sample)}
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
          placeholder={mode === "decode" ? "fVLBip… or %3Csamlp…" : "<samlp:AuthnRequest …>"}
          rows={6}
        />
      </Field>

      {input.trim() && error ? <ErrorNote>{error}</ErrorNote> : null}

      {mode === "decode" && decoded && !error ? (
        <>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="primary">{decoded.binding}</Badge>
          </div>
          <OutputArea value={decoded.xml} label="Decoded XML" filename="saml.xml" mono />
        </>
      ) : null}

      {mode === "encode" && encoded && !error ? (
        <>
          <OutputArea
            value={encoded.redirect}
            label="HTTP-Redirect (DEFLATE + Base64 + URL-encoded)"
            filename="saml-redirect.txt"
            mono
          />
          <OutputArea
            value={encoded.post}
            label="HTTP-POST (Base64)"
            filename="saml-post.txt"
            mono
          />
        </>
      ) : null}
    </>
  );
}
