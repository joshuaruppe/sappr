import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Field, ErrorNote } from "@/components/tool/parts";
import { Badge } from "@/components/ui/badge";
import { parseSid } from "./logic";

function Row({ label, value, mono = true }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className={mono ? "min-w-0 break-all font-mono text-foreground" : "min-w-0 text-foreground"}>
        {value}
      </span>
    </div>
  );
}

export default function SidTool() {
  const [input, setInput] = useState("");
  const r = useMemo(() => parseSid(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="SID (string or binary)"
        hint="A SID string (S-1-5-21-…-500) or its binary form as hex or base64. Both forms are shown."
      >
        <Input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="S-1-5-21-1004336348-1177238915-682003330-512"
        />
      </Field>

      {hasInput && r.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {r.sid && !r.error ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card/40 p-3">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="break-all font-mono text-sm text-foreground">{r.sid}</span>
              {r.name ? <Badge variant="primary">{r.name}</Badge> : null}
              <Badge variant="muted">from {r.format}</Badge>
            </div>
            <Row
              label="Authority"
              value={
                <>
                  {r.authority}
                  {r.authorityName ? (
                    <span className="ml-2 text-muted-foreground">{r.authorityName}</span>
                  ) : null}
                </>
              }
            />
            <Row label="Sub-authorities" value={r.subAuthorities.join(" · ") || "—"} />
            {r.rid !== undefined ? (
              <Row
                label="RID"
                value={
                  <>
                    {r.rid}
                    {r.ridName ? <span className="ml-2 text-muted-foreground">{r.ridName}</span> : null}
                  </>
                }
              />
            ) : null}
            {r.domainSid ? <Row label="Domain SID" value={r.domainSid} /> : null}
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card/40 p-3">
            <Row label="Binary (hex)" value={r.binaryHex} />
          </div>
        </div>
      ) : null}
    </>
  );
}
