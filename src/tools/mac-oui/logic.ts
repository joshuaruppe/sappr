/**
 * MAC address → vendor lookup and bit-field decoding. Extracts every MAC it can
 * find in pasted text (colon, hyphen, Cisco dotted or bare-12-hex forms — so you
 * can paste `arp -a`, `ip neigh` or config dumps directly), then for each one
 * resolves the vendor from the bundled IEEE OUI registry and decodes the two
 * meaningful bits of the first octet:
 *   - I/G bit → unicast vs multicast
 *   - U/L bit → globally-unique (real vendor) vs locally administered
 * The U/L bit is the useful pentest tell: a set U/L bit with no registered
 * vendor is almost always a randomized/private MAC (modern iOS/Android privacy)
 * or a virtual interface — not real hardware. More-specific IEEE blocks (MA-S
 * 36-bit, MA-M 28-bit) win over the 24-bit MA-L block. The registry is
 * dynamic-imported so it only loads with the tool. Entirely client-side.
 */

export interface OuiData {
  count: number;
  sources?: Record<string, number>;
  prefixes: Record<string, string>;
}

export interface MacInfo {
  /** The raw substring the MAC was matched from. */
  input: string;
  /** Canonical AA:BB:CC:DD:EE:FF. */
  mac: string;
  /** The 24-bit OUI, AA:BB:CC. */
  oui: string;
  /** Registered organization, or null when unassigned / locally administered. */
  vendor: string | null;
  /** U/L bit set → locally administered (randomized, virtual or manually set). */
  local: boolean;
  /** I/G bit set → group/multicast address. */
  multicast: boolean;
  /** ff:ff:ff:ff:ff:ff. */
  broadcast: boolean;
  /** A short human note when something is notable (randomized MAC, broadcast…). */
  note?: string;
}

export interface MacResult {
  entries: MacInfo[];
  /** Tokens shaped like a MAC that didn't resolve to a valid 48-bit address. */
  malformed: string[];
  error: string;
}

// Matches colon/hyphen (00:11:22:33:44:55), Cisco dotted (0011.2233.4455) and
// bare 12-hex forms. `\b` keeps the bare form from matching inside a longer hash.
const MAC_RE =
  /(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}|(?:[0-9a-f]{4}\.){2}[0-9a-f]{4}|\b[0-9a-f]{12}\b/gi;

/** Strip separators and lowercase → 12 hex chars. */
function normalize(raw: string): string {
  return raw.replace(/[.:-]/g, "").toLowerCase();
}

function groupHex(hex: string): string {
  return (hex.match(/.{2}/g) ?? []).join(":").toUpperCase();
}

/** Decode a normalized 12-hex MAC against the OUI registry. */
export function analyzeMac(hex: string, input: string, data: OuiData): MacInfo {
  const first = parseInt(hex.slice(0, 2), 16);
  const local = ((first >> 1) & 1) === 1;
  const multicast = (first & 1) === 1;
  const broadcast = hex === "ffffffffffff";

  // Longest (most specific) registered block wins.
  const vendor =
    data.prefixes[hex.slice(0, 9)] ??
    data.prefixes[hex.slice(0, 7)] ??
    data.prefixes[hex.slice(0, 6)] ??
    null;

  let note: string | undefined;
  if (broadcast) {
    note = "Broadcast address (all ones): every station on the segment.";
  } else if (local && !vendor) {
    note =
      "Locally administered, no registered vendor: almost certainly a randomized or manually-set MAC (modern iOS/Android privacy, a VM, or a virtual interface), not real hardware.";
  } else if (local && vendor) {
    note = "Locally administered bit set, but the OUI is registered: spoofed or manually overridden.";
  } else if (multicast) {
    note = "Group/multicast address, not an individual host.";
  }

  return {
    input,
    mac: groupHex(hex),
    oui: groupHex(hex.slice(0, 6)),
    vendor,
    local,
    multicast,
    broadcast,
    note,
  };
}

/** Whether a token is laid out like a MAC address — hex pairs joined by `:`/`-`,
 * or Cisco-style 4-hex groups joined by `.`. Lets us tell a mistyped MAC apart
 * from ordinary text (words, IPs, IPv6), which never matches this shape. */
function looksLikeMacAttempt(tok: string): boolean {
  return (
    /^[0-9a-f]{1,2}([:-][0-9a-f]{1,2})+$/i.test(tok) ||
    /^[0-9a-f]{4}(\.[0-9a-f]{4})+$/i.test(tok)
  );
}

/** Extract and analyze every MAC in the input text (deduped, in first-seen order).
 * A second pass flags MAC-shaped tokens that failed to parse (likely typos). */
export function lookupMacs(input: string, data: OuiData): MacResult {
  if (!input.trim()) return { entries: [], malformed: [], error: "" };
  const entries: MacInfo[] = [];
  const seen = new Set<string>();
  for (const m of input.matchAll(MAC_RE)) {
    const hex = normalize(m[0]);
    if (hex.length !== 12 || seen.has(hex)) continue;
    seen.add(hex);
    entries.push(analyzeMac(hex, m[0], data));
  }

  // Surface MAC-shaped-but-invalid tokens (wrong length / group count) rather
  // than dropping them silently. Wrapping punctuation is trimmed first; anything
  // that isn't laid out like a MAC (prose, IPs) is ignored, keeping the noise low.
  const malformed: string[] = [];
  const seenBad = new Set<string>();
  for (const raw of input.split(/[\s,;]+/)) {
    const tok = raw.replace(/^[^0-9a-f:.-]+/i, "").replace(/[^0-9a-f]+$/i, "");
    if (!tok || seenBad.has(tok) || !looksLikeMacAttempt(tok) || normalize(tok).length === 12) {
      continue;
    }
    seenBad.add(tok);
    malformed.push(tok);
  }

  return { entries, malformed, error: "" };
}

/** A NIST NVD keyword-search URL for a vendor, with common corporate suffixes
 * trimmed for a less-noisy query. Deliberately vendor-level: an OUI identifies
 * only the manufacturer, never the device model or firmware — so this is a lead
 * to chase, not evidence that a particular device is vulnerable. */
export function nvdSearchUrl(vendor: string): string {
  const q = vendor
    .replace(/[.,]/g, " ")
    .replace(
      /\b(inc|incorporated|corp|corporation|co|company|ltd|limited|llc|gmbh|ag|sarl|srl|bv|plc|pvt|pte)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  const query = q || vendor;
  // NVD's search is a hash-routed SPA — the keyword lives in the fragment, not a
  // query string (the old ?query= endpoint just redirects to an empty search).
  return `https://nvd.nist.gov/vuln/search#/nvd/home?keyword=${encodeURIComponent(query)}&resultType=records`;
}

let dataPromise: Promise<OuiData> | null = null;

function getData(): Promise<OuiData> {
  if (!dataPromise) {
    dataPromise = import("./data.json")
      .then((m) => m.default as unknown as OuiData)
      .catch((e) => {
        dataPromise = null; // don't memoize a failed load
        throw e;
      });
  }
  return dataPromise;
}

/** Look up MACs; dynamic-imports the bundled IEEE OUI registry (cached after first load). */
export async function analyzeMacs(input: string): Promise<MacResult> {
  const data = await getData();
  return lookupMacs(input, data);
}

/** Number of OUI prefixes in the bundled registry — for the tool's stat field. */
export async function getOuiCount(): Promise<number> {
  return (await getData()).count;
}
