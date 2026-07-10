import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Field, ErrorNote } from "@/components/tool/parts";
import { bytesFromInput } from "@/lib/bytes";
import { disassemble, ARCHS, type DisasmResult } from "./logic";

const SAMPLE = "55 48 89 e5 48 83 ec 20 c3";

export default function DisasmTool() {
  const [input, setInput] = useState("");
  const [arch, setArch] = useState("x86-64");
  const [addr, setAddr] = useState("0x1000");
  const [result, setResult] = useState<DisasmResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (input.trim() === "") {
      setResult(null);
      setBusy(false);
      return;
    }
    let cancelled = false;
    let bytes: Uint8Array;
    try {
      bytes = bytesFromInput(input);
    } catch {
      setResult({ insns: [], error: "Could not read the bytes — paste as hex or Base64." });
      return;
    }
    const parsed = /^0x/i.test(addr.trim()) ? parseInt(addr.trim(), 16) : Number(addr.trim());
    const address = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    setBusy(true);
    disassemble(bytes, arch, address)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch((e) => {
        if (!cancelled) setResult({ insns: [], error: String(e) });
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [input, arch, addr]);

  return (
    <>
      <Field
        label="Bytes"
        hint="Paste machine code as hex or Base64. Disassembly runs entirely in your browser (WASM Capstone)."
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
          placeholder="55 48 89 e5 48 83 ec 20 …   or   VUiJ5Ug…"
          rows={4}
        />
      </Field>

      <div className="flex flex-wrap gap-4">
        <Field label="Architecture">
          <select
            value={arch}
            onChange={(e) => setArch(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ARCHS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Base address">
          <Input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="0x1000"
            className="w-36 font-mono"
            spellCheck={false}
          />
        </Field>
      </div>

      {busy ? <p className="text-sm text-muted-foreground">Disassembling…</p> : null}
      {result?.error ? <ErrorNote>{result.error}</ErrorNote> : null}

      {result && result.insns.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody className="font-mono">
              {result.insns.map((i, idx) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                    0x{i.address.toString(16).padStart(8, "0")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-xs text-muted-foreground">{i.bytes}</td>
                  <td className="px-3 py-1.5 font-medium text-primary">{i.mnemonic}</td>
                  <td className="px-3 py-1.5">{i.opStr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
