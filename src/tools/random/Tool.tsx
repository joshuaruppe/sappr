import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { randomToken, randomInt, type TokenFormat } from "./logic";

type Tab = "token" | "number";

export default function RandomTool() {
  const [tab, setTab] = useState<Tab>("token");

  // Token mode
  const [byteLen, setByteLen] = useState("32");
  const [fmt, setFmt] = useState<TokenFormat>("hex");
  const [count, setCount] = useState("1");
  const [tokens, setTokens] = useState<string[]>([]);
  const [tokenError, setTokenError] = useState("");

  // Number mode
  const [min, setMin] = useState("1");
  const [max, setMax] = useState("100");
  const [num, setNum] = useState("");
  const [numError, setNumError] = useState("");

  const genTokens = useCallback(() => {
    try {
      const n = Number(byteLen);
      const c = Number(count);
      if (!Number.isInteger(c) || c < 1 || c > 1000) {
        throw new Error("Count must be an integer between 1 and 1000.");
      }
      const out: string[] = [];
      for (let i = 0; i < c; i++) out.push(randomToken(n, fmt));
      setTokens(out);
      setTokenError("");
    } catch (e) {
      setTokens([]);
      setTokenError(e instanceof Error ? e.message : String(e));
    }
  }, [byteLen, fmt, count]);

  const genNumber = useCallback(() => {
    try {
      const lo = Number(min);
      const hi = Number(max);
      if (!Number.isInteger(lo) || !Number.isInteger(hi)) {
        throw new Error("Min and max must be integers.");
      }
      setNum(String(randomInt(lo, hi)));
      setNumError("");
    } catch (e) {
      setNum("");
      setNumError(e instanceof Error ? e.message : String(e));
    }
  }, [min, max]);

  // Generate once on mount for each mode the first time it is shown.
  useEffect(() => {
    if (tab === "token" && tokens.length === 0 && !tokenError) genTokens();
    if (tab === "number" && num === "" && !numError) genNumber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <>
      <Segmented<Tab>
        aria-label="Mode"
        value={tab}
        onChange={setTab}
        options={[
          { value: "token", label: "Token" },
          { value: "number", label: "Number" },
        ]}
      />

      {tab === "token" ? (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Byte length" className="w-32">
              <Input
                type="number"
                min={1}
                max={1024}
                value={byteLen}
                onChange={(e) => setByteLen(e.target.value)}
              />
            </Field>
            <Field label="Count" className="w-28">
              <Input
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </Field>
            <Field label="Format" className="flex-1">
              <Segmented<TokenFormat>
                aria-label="Output format"
                value={fmt}
                onChange={setFmt}
                options={[
                  { value: "hex", label: "Hex" },
                  { value: "base64", label: "Base64" },
                  { value: "base64url", label: "Base64URL" },
                  { value: "decimal", label: "Decimal" },
                ]}
              />
            </Field>
          </div>

          <div>
            <Button variant="primary" onClick={genTokens}>
              <RefreshCw className="size-3.5" />
              Generate
            </Button>
          </div>

          {tokenError ? <ErrorNote>{tokenError}</ErrorNote> : null}

          {tokens.length > 1 ? (
            <Field
              label={`${tokens.length} tokens`}
              actions={<CopyButton value={tokens.join("\n")} label="Copy all" />}
            >
              <OutputArea
                value={tokens.join("\n")}
                placeholder="No tokens generated."
                rows={Math.min(tokens.length, 12)}
              />
            </Field>
          ) : (
            <OutputArea
              label="Token"
              value={tokens[0] ?? ""}
              placeholder="No token generated."
              rows={3}
            />
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Min" className="w-36">
              <Input
                type="number"
                value={min}
                onChange={(e) => setMin(e.target.value)}
              />
            </Field>
            <Field label="Max" className="w-36">
              <Input
                type="number"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </Field>
          </div>

          <div>
            <Button variant="primary" onClick={genNumber}>
              <RefreshCw className="size-3.5" />
              Generate
            </Button>
          </div>

          {numError ? <ErrorNote>{numError}</ErrorNote> : null}

          <Field
            label="Random integer (inclusive)"
            actions={num ? <CopyButton value={num} /> : undefined}
          >
            <div className="flex h-12 items-center rounded-md border border-input bg-card/60 px-4 font-mono text-2xl tabular-nums">
              {num || <span className="text-muted-foreground">—</span>}
            </div>
          </Field>
        </>
      )}
    </>
  );
}
