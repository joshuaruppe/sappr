// Pull the public LOLDrivers catalog (known-vulnerable + malicious Windows drivers)
// and bundle a compact lookup (by hash and by filename) for the driver-check tool.
//
//   npm run update:loldrivers
//
// Source: https://www.loldrivers.io (community-maintained, the same catalog behind
// Microsoft's vulnerable-driver blocklist work). The data is factual driver
// metadata (hashes, filenames, CVEs); we bundle a derived lookup and re-run to refresh.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT = path.join(ROOT, "src/tools/loldrivers/data.json");
const SRC = "https://www.loldrivers.io/api/drivers.json";

console.log(`Fetching ${SRC} ...`);
const res = await fetch(SRC, { headers: { "User-Agent": "sappr-loldrivers-updater" } });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const raw = await res.json();
if (!Array.isArray(raw)) throw new Error("Expected a JSON array of drivers");

console.log(`Fetched ${raw.length} entries.`);
console.log(`First entry keys: ${Object.keys(raw[0] || {}).join(", ")}`);
const firstSample = raw[0]?.KnownVulnerableSamples?.[0];
if (firstSample) console.log(`First sample keys: ${Object.keys(firstSample).join(", ")}`);

const norm = (s) => (s ?? "").toString().trim().toLowerCase();
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const drivers = [];
const hashes = {}; // hash (lowercase) -> driver index
const names = {}; // filename (lowercase) -> [driver indices]

for (const d of raw) {
  const samples = [];
  for (const s of arr(d.KnownVulnerableSamples)) {
    samples.push({
      filename: (s.Filename ?? "").toString().trim(),
      md5: norm(s.MD5),
      sha1: norm(s.SHA1),
      sha256: norm(s.SHA256),
      hvci: norm(s.LoadsDespiteHVCI) === "true",
    });
  }
  const driver = {
    id: (d.Id ?? "").toString().trim(),
    category: (d.Category ?? "").toString().trim(),
    author: (d.Author ?? "").toString().trim(),
    samples,
  };
  const idx = drivers.push(driver) - 1;
  for (const s of samples) {
    for (const h of [s.md5, s.sha1, s.sha256]) {
      if (/^[0-9a-f]{32,64}$/.test(h)) hashes[h] = idx;
    }
    const fn = norm(s.filename);
    if (fn) (names[fn] ??= []).push(idx);
  }
  // Tags are effectively just filename aliases; index any .sys tag too.
  for (const t of arr(d.Tags)) {
    const tn = norm(t);
    if (/\.sys$/.test(tn)) (names[tn] ??= []).push(idx);
  }
}

for (const k of Object.keys(names)) names[k] = [...new Set(names[k])];

const data = { count: drivers.length, drivers, hashes, names };
const json = JSON.stringify(data);
writeFileSync(OUT, json);
console.log(
  `\nWrote ${OUT}\n  ${drivers.length} drivers, ${Object.keys(hashes).length} hashes, ` +
    `${Object.keys(names).length} filenames, ${(Buffer.byteLength(json) / 1024 / 1024).toFixed(2)} MB`,
);
