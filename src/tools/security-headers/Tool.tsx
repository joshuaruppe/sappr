import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { analyzeHeaders } from "./logic";

const SAMPLE = `HTTP/1.1 200 OK
Date: Sat, 05 Jul 2026 12:00:00 GMT
Server: Apache/2.4.41 (Ubuntu)
X-Powered-By: PHP/7.4.3
Content-Type: text/html; charset=UTF-8
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https:
Set-Cookie: SESSIONID=9a8b7c6d; Path=/
Set-Cookie: prefs=dark; Path=/; Secure; SameSite=Lax`;

export default function SecurityHeadersTool() {
  const [input, setInput] = useState("");
  const r = useMemo(() => analyzeHeaders(input), [input]);
  const hasInput = input.trim() !== "";

  return (
    <>
      <Field
        label="HTTP response headers"
        hint="Paste a raw response header block (from Burp, curl -I, or devtools). Analyzed in your browser - no request is made."
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
          placeholder={"Content-Security-Policy: default-src 'self'\nStrict-Transport-Security: max-age=31536000"}
          rows={8}
        />
      </Field>

      {hasInput && r.error ? <ErrorNote>{r.error}</ErrorNote> : null}

      {!r.error && r.headers.length > 0 ? (
        <div className="flex flex-col gap-4">
          <FindingsSection findings={r.findings} emptyLabel="No header issues found." />

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Headers ({r.headers.length})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-2.5 py-1.5 font-medium">Header</th>
                    <th className="px-2.5 py-1.5 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {r.headers.map((h, i) => (
                    <tr key={i} className="border-t border-border/60 align-top">
                      <td className="whitespace-nowrap px-2.5 py-1.5 text-foreground">{h.name}</td>
                      <td className="px-2.5 py-1.5 break-all text-muted-foreground">{h.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
