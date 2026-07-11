// Pull the IEEE MAC address block registries (MA-L / MA-M / MA-S) and bundle
// them into a compact prefix→vendor map for the MAC OUI lookup tool.
//
//   npm run update:oui
//
// Source: IEEE Registration Authority public registry (standards-oui.ieee.org).
// The assignment→organization mappings are factual registry data, published by
// IEEE for free download. We bundle a derived lookup map and re-run this to
// refresh. Longer, more-specific blocks (MA-S 36-bit, MA-M 28-bit) take
// precedence over the 24-bit MA-L block at lookup time.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT = path.join(ROOT, "src/tools/mac-oui/data.json");

const SOURCES = [
  { name: "MA-L", url: "https://standards-oui.ieee.org/oui/oui.csv" },
  { name: "MA-M", url: "https://standards-oui.ieee.org/oui28/mam.csv" },
  { name: "MA-S", url: "https://standards-oui.ieee.org/oui36/oui36.csv" },
];

/** Minimal RFC-4180 CSV parser (handles quoted fields with embedded commas,
 * escaped `""` quotes and CRLF). Returns an array of string[] rows. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const prefixes = {};
const perSource = {};

for (const src of SOURCES) {
  console.log(`Fetching ${src.name} — ${src.url} …`);
  let text;
  try {
    const res = await fetch(src.url, { headers: { "User-Agent": "sappr-oui-updater" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (e) {
    // MA-L is mandatory; the smaller blocks are best-effort.
    if (src.name === "MA-L") throw new Error(`Failed to fetch ${src.name}: ${e.message}`);
    console.warn(`  ! skipping ${src.name}: ${e.message}`);
    continue;
  }

  const rows = parseCsv(text);
  let n = 0;
  for (const cols of rows) {
    // Columns: Registry, Assignment(hex), Organization Name, Organization Address
    if (cols.length < 3) continue;
    const assignment = (cols[1] || "").trim().toLowerCase();
    const name = (cols[2] || "").trim().replace(/\s+/g, " ");
    if (!/^[0-9a-f]{6,9}$/.test(assignment) || !name) continue; // skips the header row
    prefixes[assignment] = name;
    n++;
  }
  perSource[src.name] = n;
  console.log(`  ${n.toLocaleString()} entries`);
}

const count = Object.keys(prefixes).length;
if (count < 10000) {
  throw new Error(`Only ${count} prefixes parsed — the IEEE CSV format may have changed.`);
}

const data = { count, sources: perSource, prefixes };
writeFileSync(OUT, JSON.stringify(data));
const bytes = Buffer.byteLength(JSON.stringify(data));
console.log(
  `\nWrote ${OUT}\n  ${count.toLocaleString()} prefixes · ${(bytes / 1024 / 1024).toFixed(2)} MB`,
);
