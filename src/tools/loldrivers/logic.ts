/**
 * Look a Windows driver up against the bundled LOLDrivers catalog (known-vulnerable
 * and malicious drivers). Query by hash (MD5/SHA1/SHA256) or by filename and get
 * the category, author, whether any sample loads despite HVCI, and the matching
 * sample hashes. Dual-use and leaning defensive: it's the same catalog blue teams
 * use to build driver blocklists. The ~0.8 MB dataset is dynamic-imported so it
 * only loads with the tool. Entirely client-side.
 */

export interface DriverSample {
  filename: string;
  md5: string;
  sha1: string;
  sha256: string;
  /** Reported to load even with HVCI / memory integrity enabled. */
  hvci: boolean;
}

export interface Driver {
  id: string;
  /** "vulnerable driver" or "malicious". */
  category: string;
  author: string;
  samples: DriverSample[];
}

export interface DriverData {
  count: number;
  drivers: Driver[];
  hashes: Record<string, number>; // hash (lowercase) -> driver index
  names: Record<string, number[]>; // filename (lowercase) -> driver indices
}

export interface DriverMatch {
  driver: Driver;
  /** The specific sample a hash query matched, if the query was a hash. */
  matchedSample?: DriverSample;
}

export interface LookupResult {
  query: string;
  kind: "hash" | "filename" | "empty";
  matches: DriverMatch[];
  error: string;
}

/** Canonical loldrivers.io page for a driver entry. */
export function loldriversUrl(id: string): string {
  return `https://www.loldrivers.io/drivers/${encodeURIComponent(id)}/`;
}

const HEX = /^[0-9a-f]+$/i;

/** Look up a driver by hash or filename against the catalog. Pure. */
export function lookupDriver(input: string, data: DriverData): LookupResult {
  const raw = input.trim();
  if (!raw) return { query: raw, kind: "empty", matches: [], error: "" };
  const q = raw.toLowerCase();

  // A hash: 32 (MD5), 40 (SHA1) or 64 (SHA256) hex characters.
  if (HEX.test(q) && (q.length === 32 || q.length === 40 || q.length === 64)) {
    const idx = data.hashes[q];
    if (idx === undefined) return { query: raw, kind: "hash", matches: [], error: "" };
    const driver = data.drivers[idx];
    const matchedSample = driver.samples.find(
      (s) => s.md5 === q || s.sha1 === q || s.sha256 === q,
    );
    return { query: raw, kind: "hash", matches: [{ driver, matchedSample }], error: "" };
  }

  // Otherwise treat it as a filename (add .sys if the user left it off).
  const candidates = q.endsWith(".sys") ? [q] : [q, q + ".sys"];
  const seen = new Set<number>();
  const matches: DriverMatch[] = [];
  for (const c of candidates) {
    for (const idx of data.names[c] ?? []) {
      if (!seen.has(idx)) {
        seen.add(idx);
        matches.push({ driver: data.drivers[idx] });
      }
    }
  }
  return { query: raw, kind: "filename", matches, error: "" };
}

let dataPromise: Promise<DriverData> | null = null;

function getData(): Promise<DriverData> {
  if (!dataPromise) {
    dataPromise = import("./data.json")
      .then((m) => m.default as unknown as DriverData)
      .catch((e) => {
        dataPromise = null; // don't memoize a failed load
        throw e;
      });
  }
  return dataPromise;
}

/** Look up a driver; dynamic-imports the bundled LOLDrivers catalog (cached after first load). */
export async function analyzeDriver(input: string): Promise<LookupResult> {
  return lookupDriver(input, await getData());
}

/** Number of catalogued drivers, for the tool's stat field. */
export async function getDriverCount(): Promise<number> {
  return (await getData()).count;
}
