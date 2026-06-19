/**
 * Text diffing over lines, words, or characters, built on the `diff` library.
 * Pure functions — no DOM or React.
 */
import * as Diff from "diff";

export type DiffMode = "lines" | "words" | "chars";

export interface DiffPart {
  value: string;
  added: boolean;
  removed: boolean;
}

export interface DiffSummary {
  /** Number of added parts (segments present in `b` but not `a`). */
  added: number;
  /** Number of removed parts (segments present in `a` but not `b`). */
  removed: number;
}

export interface DiffResult {
  parts: DiffPart[];
  summary: DiffSummary;
}

/**
 * Compare `a` (original) against `b` (changed) at the given granularity.
 * Returns the ordered diff parts plus +/- summary counts.
 */
export function computeDiff(a: string, b: string, mode: DiffMode): DiffResult {
  let raw: Array<{ value: string; added?: boolean; removed?: boolean }>;
  switch (mode) {
    case "words":
      raw = Diff.diffWords(a, b);
      break;
    case "chars":
      raw = Diff.diffChars(a, b);
      break;
    case "lines":
    default:
      raw = Diff.diffLines(a, b);
      break;
  }

  let added = 0;
  let removed = 0;
  const parts: DiffPart[] = raw.map((p) => {
    const isAdded = Boolean(p.added);
    const isRemoved = Boolean(p.removed);
    if (isAdded) added++;
    if (isRemoved) removed++;
    return { value: p.value, added: isAdded, removed: isRemoved };
  });

  return { parts, summary: { added, removed } };
}
