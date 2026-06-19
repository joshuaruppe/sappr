import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Field, OutputArea, ErrorNote, FileDrop } from "@/components/tool/parts";
import { formatBytes } from "@/lib/utils";
import {
  extractStrings,
  formatStrings,
  type StringsEncoding,
} from "./logic";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB read cap

export default function StringsTool() {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [minLength, setMinLength] = useState(4);
  const [encoding, setEncoding] = useState<StringsEncoding>("ascii");
  const [showOffsets, setShowOffsets] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    try {
      const tooBig = file.size > MAX_BYTES;
      const blob = tooBig ? file.slice(0, MAX_BYTES) : file;
      const buf = await blob.arrayBuffer();
      setBytes(new Uint8Array(buf));
      setFileName(file.name);
      setTruncated(tooBig);
    } catch (e) {
      setBytes(null);
      setFileName("");
      setTruncated(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Extract once per input/options. Toggling "Show offsets" only re-runs the
  // cheap formatting pass below, not the full scan. Errors are returned (not
  // set via setState during render).
  const extraction = useMemo(() => {
    if (!bytes || bytes.length === 0) return { results: [], error: "" };
    try {
      return {
        results: extractStrings(bytes, { minLength, encoding }),
        error: "",
      };
    } catch (e) {
      return {
        results: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [bytes, minLength, encoding]);

  const output = useMemo(
    () => formatStrings(extraction.results, showOffsets),
    [extraction.results, showOffsets],
  );
  const count = extraction.results.length;

  return (
    <>
      <FileDrop
        onFile={handleFile}
        hint={
          fileName
            ? `${fileName}. Drop another file to replace`
            : "Drop any file here, or click to browse"
        }
      />

      {truncated ? (
        <ErrorNote>
          File is larger than {formatBytes(MAX_BYTES)}; only the first{" "}
          {formatBytes(MAX_BYTES)} were scanned.
        </ErrorNote>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Field label="Min length" className="w-28">
          <Input
            type="number"
            min={1}
            value={minLength}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              setMinLength(Number.isFinite(n) && n >= 1 ? n : 1);
            }}
          />
        </Field>

        <Field label="Encoding">
          <Segmented<StringsEncoding>
            aria-label="Encoding"
            value={encoding}
            onChange={setEncoding}
            options={[
              { value: "ascii", label: "ASCII" },
              { value: "utf-16le", label: "UTF-16LE" },
            ]}
          />
        </Field>

        <div className="flex h-9 items-center">
          <Switch
            checked={showOffsets}
            onChange={setShowOffsets}
            label="Show offsets"
            title="Prefix each line with its hex byte offset"
          />
        </div>
      </div>

      {error || extraction.error ? (
        <ErrorNote>{error || extraction.error}</ErrorNote>
      ) : null}

      <OutputArea
        value={output}
        label={count ? `Strings (${count.toLocaleString()})` : "Strings"}
        filename={fileName ? `${fileName}.strings.txt` : "strings.txt"}
        rows={14}
      />
    </>
  );
}
