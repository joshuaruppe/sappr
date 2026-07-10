/**
 * Shannon-entropy analysis of a file — the "is this packed/encrypted?" view.
 * Computes overall entropy, a per-block entropy series (for an entropy-vs-offset
 * graph) and a byte histogram, then verdicts and flags high-entropy regions that
 * suggest compression, encryption or packing. Pure — no DOM.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface EntropyResult {
  size: number;
  overall: number;
  blockSize: number;
  blocks: number[];
  histogram: number[];
  verdict: string;
  findings: Finding[];
  error: string;
}

function shannon(freq: number[], n: number): number {
  if (n === 0) return 0;
  let e = 0;
  for (const c of freq) {
    if (!c) continue;
    const p = c / n;
    e -= p * Math.log2(p);
  }
  return e;
}

const round = (x: number) => Math.round(x * 100) / 100;

export function analyzeEntropy(bytes: Uint8Array): EntropyResult {
  const empty: EntropyResult = {
    size: 0,
    overall: 0,
    blockSize: 0,
    blocks: [],
    histogram: [],
    verdict: "",
    findings: [],
    error: "",
  };
  const size = bytes.length;
  if (size === 0) return empty;

  const histogram = new Array(256).fill(0);
  for (let i = 0; i < size; i++) histogram[bytes[i]]++;
  const overall = round(shannon(histogram, size));

  // Aim for ~256 blocks across the file (min 256 bytes/block).
  const blockSize = Math.max(256, Math.ceil(size / 256));
  const blocks: number[] = [];
  for (let off = 0; off < size; off += blockSize) {
    const n = Math.min(blockSize, size - off);
    const f = new Array(256).fill(0);
    for (let i = 0; i < n; i++) f[bytes[off + i]]++;
    blocks.push(round(shannon(f, n)));
  }

  const verdict =
    overall >= 7.5
      ? "Very high — likely compressed, encrypted or packed"
      : overall >= 6.5
        ? "High — compressed/encrypted data likely present"
        : overall >= 4.5
          ? "Moderate — typical of native code or mixed data"
          : "Low — sparse or highly structured data";

  const findings: Finding[] = [];
  if (overall >= 7.5) {
    findings.push({
      severity: "info",
      message: `Overall entropy ${overall}/8 — the whole file looks compressed, encrypted or packed.`,
    });
  }
  const hotBlocks = blocks.filter((b) => b >= 7.5).length;
  if (hotBlocks && overall < 7.5) {
    findings.push({
      severity: "info",
      message: `${hotBlocks} high-entropy region${hotBlocks === 1 ? "" : "s"} (≥ 7.5) — a packed/encrypted blob embedded in otherwise normal data.`,
    });
  }

  return { size, overall, blockSize, blocks, histogram, verdict, findings, error: "" };
}
