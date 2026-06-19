import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, ErrorNote } from "@/components/tool/parts";
import { parseUrl, type ParsedUrl } from "./logic";

const COMPONENT_FIELDS: { key: keyof ParsedUrl; label: string }[] = [
  { key: "href", label: "Href" },
  { key: "protocol", label: "Protocol" },
  { key: "origin", label: "Origin" },
  { key: "username", label: "Username" },
  { key: "password", label: "Password" },
  { key: "host", label: "Host" },
  { key: "hostname", label: "Hostname" },
  { key: "port", label: "Port" },
  { key: "pathname", label: "Path" },
  { key: "search", label: "Query string" },
  { key: "hash", label: "Hash" },
];

export default function UrlParserTool() {
  const [input, setInput] = useState("");

  const { parsed, error } = useMemo(() => {
    if (!input.trim()) return { parsed: null as ParsedUrl | null, error: "" };
    try {
      return { parsed: parseUrl(input), error: "" };
    } catch (e) {
      return {
        parsed: null as ParsedUrl | null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [input]);

  return (
    <>
      <Field label="URL">
        <Input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://user:pass@example.com:8443/path?x=1&y=two#frag"
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {parsed ? (
        <>
          <Field label="Components">
            <dl className="divide-y divide-border rounded-md border border-border">
              {COMPONENT_FIELDS.map(({ key, label }) => {
                const value = parsed[key] as string;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 px-3 py-1.5 text-sm"
                  >
                    <dt className="w-28 shrink-0 text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="min-w-0 flex-1 break-all font-mono">
                      {value || (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </dd>
                    {value ? (
                      <CopyButton value={value} className="shrink-0" />
                    ) : null}
                  </div>
                );
              })}
            </dl>
          </Field>

          <Field
            label="Query parameters"
            hint={`${parsed.params.length} ${
              parsed.params.length === 1 ? "param" : "params"
            }`}
          >
            {parsed.params.length === 0 ? (
              <p className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                No query parameters.
              </p>
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-3 py-1.5 font-medium">Key</th>
                      <th className="px-3 py-1.5 font-medium">Value</th>
                      <th className="w-10 px-3 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.params.map((p, i) => (
                      <tr
                        key={`${p.key}-${i}`}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-1.5 font-mono break-all">
                          {p.key}
                        </td>
                        <td className="px-3 py-1.5 font-mono break-all">
                          {p.value || (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <CopyButton value={p.value} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Field>
        </>
      ) : null}
    </>
  );
}
