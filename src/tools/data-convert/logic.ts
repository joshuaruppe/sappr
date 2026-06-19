/**
 * Convert structured data between JSON, YAML, CSV and TOML.
 * Pure functions — no DOM or React. Safe for tests and workers.
 */
import YAML from "yaml";
import Papa from "papaparse";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

export type DataFormat = "json" | "yaml" | "csv" | "toml";

export const DATA_FORMATS: DataFormat[] = ["json", "yaml", "csv", "toml"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/** Parse a string in the given format into a plain JS value. */
export function parseAny(input: string, from: DataFormat): unknown {
  switch (from) {
    case "json":
      return JSON.parse(input);
    case "yaml":
      return YAML.parse(input);
    case "toml":
      return parseToml(input);
    case "csv": {
      const result = Papa.parse<Record<string, unknown>>(input, {
        header: true,
        skipEmptyLines: true,
      });
      if (result.errors.length > 0) {
        const first = result.errors[0];
        throw new Error(`CSV parse error: ${first.message}`);
      }
      return result.data;
    }
    default:
      throw new Error(`Unsupported source format: ${from}`);
  }
}

/** Serialize a plain JS value into the given format. */
export function stringifyAny(value: unknown, to: DataFormat): string {
  switch (to) {
    case "json":
      return JSON.stringify(value, null, 2);
    case "yaml":
      return YAML.stringify(value);
    case "toml":
      if (!isPlainObject(value)) {
        throw new Error(
          "TOML output requires a top-level object/table, not an array or scalar.",
        );
      }
      return stringifyToml(value as Record<string, unknown>);
    case "csv": {
      if (!Array.isArray(value)) {
        throw new Error(
          "CSV output requires an array of flat row objects.",
        );
      }
      if (
        value.length > 0 &&
        !value.every(
          (row) =>
            isPlainObject(row) &&
            Object.values(row).every(
              (v) => v === null || typeof v !== "object",
            ),
        )
      ) {
        throw new Error(
          "CSV output requires every row to be a flat object (no nested objects or arrays).",
        );
      }
      return Papa.unparse(value as Record<string, unknown>[]);
    }
    default:
      throw new Error(`Unsupported target format: ${to}`);
  }
}

/** Convert an input string from one format to another. */
export function convert(
  input: string,
  from: DataFormat,
  to: DataFormat,
): string {
  if (input.trim() === "") return "";
  const value = parseAny(input, from);
  return stringifyAny(value, to);
}
