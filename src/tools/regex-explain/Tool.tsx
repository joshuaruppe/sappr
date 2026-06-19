import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Field, ErrorNote } from "@/components/tool/parts";
import { explainRegex, type ExplainNode } from "./logic";

function TreeNode({ node }: { node: ExplainNode }) {
  return (
    <li className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-sm font-semibold">{node.label}</span>
        {node.detail ? (
          <span className="text-xs text-muted-foreground">{node.detail}</span>
        ) : null}
      </div>
      {node.children && node.children.length > 0 ? (
        <ul className="ml-4 space-y-1 border-l border-border pl-3">
          {node.children.map((child, i) => (
            <TreeNode key={i} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function RegexExplainTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("");

  const { tree, error } = useMemo(
    () => explainRegex(pattern, flags),
    [pattern, flags],
  );

  return (
    <>
      <Field label="Pattern" hint="Enter the body of the regex, without slashes.">
        <Input
          autoFocus
          className="font-mono"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="(\d{3})-(\d{4})"
        />
      </Field>

      <Field label="Flags" hint="e.g. g, i, m, s, u, y">
        <Input
          className="font-mono"
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          placeholder="gi"
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {tree ? (
        <Field label="Explanation">
          <ul className="space-y-1 rounded-md border border-border bg-muted/30 p-3 text-sm">
            <TreeNode node={tree} />
          </ul>
        </Field>
      ) : null}
    </>
  );
}
