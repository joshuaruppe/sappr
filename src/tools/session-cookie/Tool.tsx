import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { decodeCookie, type CookieResult } from "./logic";

const SAMPLE = "eyJsb2dnZWRfaW4iOnRydWUsInVzZXIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbmlzdHJhdG9yIn0.aGkTwA.MDEyMzQ1Njc4OWFiY2RlZmdoaWo";

export default function SessionCookieTool() {
  const [input, setInput] = useState("");
  const [r, setR] = useState<CookieResult | null>(null);

  useEffect(() => {
    if (input.trim() === "") {
      setR(null);
      return;
    }
    let cancelled = false;
    decodeCookie(input)
      .then((res) => {
        if (!cancelled) setR(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setR({ type: null, typeLabel: "", payload: "", findings: [], error: String(e) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  return (
    <>
      <Field
        label="Session cookie"
        hint="Paste a session cookie value (Flask/itsdangerous, a JWT, or a Django signed value). Decoded — not verified."
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
          placeholder="eyJ1c2VyIjoiYWRtaW4ifQ.ZqR3xA.hT6…"
          rows={4}
        />
      </Field>

      {input.trim() && r?.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {r && !r.error && r.type ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="primary">{r.typeLabel}</Badge>
            {r.timestamp ? (
              <span className="font-mono text-muted-foreground">signed {r.timestamp}</span>
            ) : null}
          </div>

          {r.findings.length ? (
            <FindingsSection findings={r.findings} emptyLabel="No issues noted." />
          ) : null}

          {r.header ? (
            <OutputArea value={r.header} label="Header" filename="jwt-header.json" mono />
          ) : null}
          <OutputArea value={r.payload} label="Payload" filename="cookie-payload.json" mono />
        </div>
      ) : null}
    </>
  );
}
