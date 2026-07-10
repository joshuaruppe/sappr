import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, ErrorNote } from "@/components/tool/parts";
import { decodeAsn1, type AsnNode } from "./logic";

// AlgorithmIdentifier: sha256WithRSAEncryption + NULL params.
const SAMPLE = "300d06092a864886f70d01010b0500";

function TreeNode({ node, depth }: { node: AsnNode; depth: number }) {
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-2 py-0.5" style={{ paddingLeft: depth * 18 }}>
        <span className="text-sm font-medium text-primary">{node.type}</span>
        {node.constructed ? (
          <span className="text-xs text-muted-foreground">({node.children?.length ?? 0})</span>
        ) : node.value !== undefined ? (
          <span className="min-w-0 break-all font-mono text-sm text-muted-foreground">{node.value}</span>
        ) : null}
      </div>
      {node.children?.map((c, i) => (
        <TreeNode key={i} node={c} depth={depth + 1} />
      ))}
    </>
  );
}

export default function Asn1Tool() {
  const [input, setInput] = useState("");
  const { tree, error } = useMemo(() => decodeAsn1(input), [input]);

  return (
    <>
      <Field
        label="ASN.1 (DER / BER)"
        hint="Paste as hex, Base64 or a PEM block (-----BEGIN…). Certificates, keys, PKCS and CMS structures all decode."
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
          placeholder="30 82 03 … or  MIIC… or  -----BEGIN CERTIFICATE-----"
          rows={5}
        />
      </Field>

      {input.trim() && error ? <ErrorNote>{error}</ErrorNote> : null}

      {tree ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card/40 p-4">
          <TreeNode node={tree} depth={0} />
        </div>
      ) : null}
    </>
  );
}
