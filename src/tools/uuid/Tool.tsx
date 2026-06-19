import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { generate, type IdType } from "./logic";

export default function UuidTool() {
  const [type, setType] = useState<IdType>("v4");
  const [count, setCount] = useState(5);
  const [ids, setIds] = useState<string[]>(() => generate("v4", 5));
  const [error, setError] = useState("");

  function run(nextType: IdType, nextCount: number) {
    try {
      setIds(generate(nextType, nextCount));
      setError("");
    } catch (e) {
      setIds([]);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const clampedCount = Math.max(1, Math.min(100, Math.floor(count) || 1));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<IdType>
          aria-label="Identifier type"
          value={type}
          onChange={(t) => {
            setType(t);
            run(t, clampedCount);
          }}
          options={[
            { value: "v4", label: "UUID v4" },
            { value: "v7", label: "UUID v7" },
            { value: "ulid", label: "ULID" },
            { value: "nil", label: "NIL" },
          ]}
        />
        <Button variant="primary" size="sm" onClick={() => run(type, clampedCount)}>
          <RefreshCw className="size-3.5" />
          {ids.length ? "Regenerate" : "Generate"}
        </Button>
      </div>

      <Field label="Count" hint="1–100">
        <Input
          type="number"
          min={1}
          max={100}
          value={count}
          onChange={(e) => {
            const n = Number(e.target.value);
            setCount(Number.isFinite(n) && n >= 1 ? Math.min(100, Math.floor(n)) : 1);
          }}
          className="w-28"
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {ids.length > 0 && (
        <Field label="Identifiers">
          <ul className="flex flex-col divide-y divide-border rounded-md border border-input bg-card/60">
            {ids.map((id, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 px-3 py-1.5"
              >
                <span className="truncate font-mono text-sm">{id}</span>
                <CopyButton value={id} />
              </li>
            ))}
          </ul>
        </Field>
      )}

      <OutputArea
        value={ids.join("\n")}
        label="All identifiers"
        filename="identifiers.txt"
        placeholder="Generated identifiers appear here."
        rows={Math.min(8, Math.max(3, ids.length))}
      />
    </>
  );
}
