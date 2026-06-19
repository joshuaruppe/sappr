import { useMemo, useState } from "react";
import { ShieldOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { decodeJwt, type ExpiryStatus } from "./logic";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

const EXPIRY_LABEL: Record<ExpiryStatus, string> = {
  valid: "Valid",
  expired: "Expired",
  "not-yet-valid": "Not yet valid",
  unknown: "No expiry claim",
};

const EXPIRY_VARIANT: Record<
  ExpiryStatus,
  "success" | "warning" | "muted"
> = {
  valid: "success",
  expired: "warning",
  "not-yet-valid": "warning",
  unknown: "muted",
};

export default function JwtDecodeTool() {
  const [input, setInput] = useState("");

  const { decoded, error } = useMemo(() => {
    if (!input.trim()) return { decoded: null, error: "" };
    try {
      return { decoded: decodeJwt(input), error: "" };
    } catch (e) {
      return {
        decoded: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [input]);

  return (
    <>
      <Field
        label="JSON Web Token"
        hint="Paste a compact JWT. Decoding happens entirely in your browser."
      >
        <Textarea
          autoFocus
          mono
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={SAMPLE}
          rows={5}
        />
      </Field>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldOff className="size-3.5 shrink-0" />
        <span>
          Signature is <strong className="font-medium">not verified</strong>.
          This is decode-only. Do not trust an unverified token.
        </span>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {decoded ? (
        <>
          <Field label="Summary">
            <div className="flex flex-wrap items-center gap-2">
              {decoded.alg ? (
                <Badge variant="primary">alg: {decoded.alg}</Badge>
              ) : null}
              {decoded.typ ? (
                <Badge variant="outline">typ: {decoded.typ}</Badge>
              ) : null}
              <Badge variant={EXPIRY_VARIANT[decoded.expiry]}>
                {EXPIRY_LABEL[decoded.expiry]}
              </Badge>
            </div>
            {decoded.timeClaims.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm">
                {decoded.timeClaims.map((c) => (
                  <li
                    key={c.key}
                    className="flex flex-wrap items-baseline gap-x-2"
                  >
                    <span className="font-mono text-xs font-medium text-muted-foreground">
                      {c.key}
                    </span>
                    <span className="font-mono text-xs tabular-nums">
                      {c.raw}
                    </span>
                    <span className="text-muted-foreground">{c.utc}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Field>

          <OutputArea
            value={decoded.headerJson}
            label="Header"
            filename="jwt-header.json"
            rows={5}
          />

          <OutputArea
            value={decoded.payloadJson}
            label="Payload"
            filename="jwt-payload.json"
            rows={8}
          />
        </>
      ) : null}
    </>
  );
}
