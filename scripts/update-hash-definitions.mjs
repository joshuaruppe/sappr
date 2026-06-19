// Pull hashcat's authoritative hash-mode definitions and bundle them into the
// app, then cross-check our curated detectors against them.
//
//   npm run update:hash-defs
//
// Source: hashcat example_hashes (MIT-licensed). The mode numbers, names and
// example hashes are hashcat's; we bundle them as reference data and use them to
// enrich + validate the identifier. Re-run any time to refresh.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SRC_URL = "https://hashcat.net/wiki/doku.php?id=example_hashes";
const OUT = path.join(ROOT, "src/tools/hash-id/hashcat-modes.generated.ts");
const DATA = path.join(ROOT, "src/tools/hash-id/data.ts");

// --- 1. Pull the table ------------------------------------------------------
console.log(`Fetching ${SRC_URL} …`);
const res = await fetch(SRC_URL, {
  headers: { "User-Agent": "sappr-hash-defs-updater" },
});
if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
const html = await res.text();

function decode(s) {
  return s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const rows = [];
const seen = new Set();
const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
for (const rm of html.matchAll(rowRe)) {
  const cells = [...rm[1].matchAll(cellRe)].map((c) => decode(c[1]));
  if (cells.length < 3) continue;
  if (!/^\d+$/.test(cells[0])) continue; // skip header / non-mode rows
  const mode = Number(cells[0]);
  const name = cells[1];
  const example = cells[2];
  if (!name || seen.has(mode)) continue; // first occurrence wins
  seen.add(mode);
  rows.push({ mode, name, example });
}
rows.sort((a, b) => a.mode - b.mode);
if (rows.length < 100) {
  throw new Error(`Only parsed ${rows.length} modes — the table format may have changed.`);
}

// --- 2. Write the bundled generated file ------------------------------------
const file =
  `// AUTO-GENERATED — do not edit by hand.\n` +
  `// Source: hashcat example_hashes (MIT). Regenerate with: npm run update:hash-defs\n` +
  `// ${rows.length} modes bundled.\n\n` +
  `export interface HashcatMode {\n  mode: number;\n  /** hashcat's canonical name for this mode. */\n  name: string;\n  /** An example hash for this mode. */\n  example: string;\n}\n\n` +
  `export const HASHCAT_MODES: HashcatMode[] = ${JSON.stringify(rows, null, 2)};\n`;
writeFileSync(OUT, file);
console.log(`Wrote ${rows.length} modes -> ${path.relative(ROOT, OUT)}`);

// --- 3. Cross-check our curated detectors against the authoritative list -----
const byMode = new Map(rows.map((r) => [r.mode, r]));
const data = readFileSync(DATA, "utf8");
const curated = [];
let cur = null;
for (const line of data.split("\n")) {
  let m;
  if ((m = line.match(/^\s*id:\s*"([^"]+)"/))) {
    if (cur?.id) curated.push(cur);
    cur = { id: m[1] };
  } else if (cur && (m = line.match(/^\s*name:\s*"([^"]+)"/))) cur.name = m[1];
  else if (cur && (m = line.match(/^\s*hashcatMode:\s*(\d+)/))) cur.mode = Number(m[1]);
}
if (cur?.id) curated.push(cur);

const tokens = (s) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) || []));
const missing = [];
const review = [];
for (const c of curated) {
  if (c.mode === undefined) continue;
  const hc = byMode.get(c.mode);
  if (!hc) {
    missing.push(c);
    continue;
  }
  // Name sanity: curated name should share at least one token with hashcat's.
  const ct = tokens(c.name);
  const ht = tokens(hc.name);
  let overlap = false;
  for (const t of ct) if (ht.has(t)) overlap = true;
  if (!overlap) review.push({ ...c, hcName: hc.name });
}

console.log(`\nCurated detectors with a hashcat mode: ${curated.filter((c) => c.mode !== undefined).length}`);
if (missing.length) {
  console.log(`\n⚠️  ${missing.length} curated mode(s) NOT in hashcat's table:`);
  for (const c of missing) console.log(`   - ${c.id} (${c.name}) -> mode ${c.mode}`);
} else {
  console.log("✓ Every curated mode exists in hashcat's table.");
}
if (review.length) {
  console.log(`\n🔎 ${review.length} mode(s) where our name and hashcat's differ — review:`);
  for (const c of review)
    console.log(`   - m${c.mode}: ours="${c.name}"  hashcat="${c.hcName}"  (${c.id})`);
}
