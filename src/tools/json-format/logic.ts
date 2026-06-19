/**
 * JSON pretty-print / minify / validate using the native JSON parser.
 * Pure functions — no DOM/React, safe for tests and workers.
 */

export type JsonIndent = "2" | "4" | "tab";

export interface FormatJsonOptions {
  /** Produce a single-line, whitespace-free string. */
  minify?: boolean;
  /** Indentation used when not minifying (default "2"). */
  indent?: JsonIndent;
  /** Recursively sort object keys for stable output. */
  sortKeys?: boolean;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function isPlainObject(value: unknown): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Recursively reorder object keys so the serialized output is stable. */
function sortValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (isPlainObject(value)) {
    const sorted: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortValue(value[key]);
    }
    return sorted;
  }
  return value;
}

function indentString(indent: JsonIndent): string | number {
  switch (indent) {
    case "tab":
      return "\t";
    case "4":
      return 4;
    case "2":
    default:
      return 2;
  }
}

export function formatJson(input: string, opts: FormatJsonOptions = {}): string {
  if (input.trim() === "") return "";

  let parsed: JsonValue;
  try {
    parsed = JSON.parse(input) as JsonValue;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON: ${message}`);
  }

  const value = opts.sortKeys ? sortValue(parsed) : parsed;
  const space = opts.minify ? undefined : indentString(opts.indent ?? "2");
  return JSON.stringify(value, null, space);
}
