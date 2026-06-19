import { useDeferredValue, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Label } from "@/components/ui/label";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { formatSql, type SqlDialect, type KeywordCase } from "./logic";

const DIALECTS: { value: SqlDialect; label: string }[] = [
  { value: "sql", label: "Standard SQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "transactsql", label: "T-SQL" },
  { value: "bigquery", label: "BigQuery" },
  { value: "mariadb", label: "MariaDB" },
];

export default function SqlFormatTool() {
  const [input, setInput] = useState("");
  const [dialect, setDialect] = useState<SqlDialect>("sql");
  const [keywordCase, setKeywordCase] = useState<KeywordCase>("upper");
  const [tabWidth, setTabWidth] = useState<2 | 4>(2);
  const deferredInput = useDeferredValue(input);

  const { output, error } = useMemo(() => {
    if (!deferredInput.trim()) return { output: "", error: "" };
    try {
      return {
        output: formatSql(deferredInput, { dialect, keywordCase, tabWidth }),
        error: "",
      };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [deferredInput, dialect, keywordCase, tabWidth]);

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Dialect" className="w-auto">
          <select
            aria-label="Dialect"
            value={dialect}
            onChange={(e) => setDialect(e.target.value as SqlDialect)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {DIALECTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex flex-col gap-1.5">
          <Label>Keyword case</Label>
          <Segmented<KeywordCase>
            aria-label="Keyword case"
            value={keywordCase}
            onChange={setKeywordCase}
            options={[
              { value: "upper", label: "UPPER" },
              { value: "lower", label: "lower" },
              { value: "preserve", label: "Preserve" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Indent</Label>
          <Segmented<"2" | "4">
            aria-label="Indent width"
            value={String(tabWidth) as "2" | "4"}
            onChange={(v) => setTabWidth(v === "4" ? 4 : 2)}
            options={[
              { value: "2", label: "2" },
              { value: "4", label: "4" },
            ]}
          />
        </div>
      </div>

      <Field label="SQL to format">
        <Textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="select a,b from t where a=1"
          rows={8}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <OutputArea
        value={output}
        label="Formatted"
        filename="formatted.sql"
      />
    </>
  );
}
