/**
 * Decode a PowerShell -EncodedCommand: extract the Base64, decode it as UTF-16LE
 * (the PowerShell default) and then auto-unwrap the common obfuscation layer -
 * an inner Base64 payload run through DeflateStream/GzipStream. Uses the browser
 * DecompressionStream, so it's client-side only. No DOM beyond that global.
 */

export interface PsLayer {
  label: string;
  text: string;
}

export interface PsResult {
  layers: PsLayer[];
  error: string;
}

/** Outer-Base64 text encoding: auto-detect, or force one when the heuristic
 * can't disambiguate (e.g. non-Latin UTF-16LE vs UTF-8). */
export type OuterEncoding = "auto" | "utf-16le" | "utf-8";

/** Pull the most likely Base64 blob out of a raw paste (a bare blob, a
 * `powershell -enc <b64>` line, or a full command line). */
export function extractBase64(input: string): string {
  const runs = input.match(/[A-Za-z0-9+/=]{16,}/g);
  if (!runs || runs.length === 0) return input.trim();
  return runs.reduce((a, b) => (b.length > a.length ? b : a));
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Heuristic: PowerShell -enc data is UTF-16LE, so ASCII text has a NUL at every
 * odd byte. */
function looksUtf16le(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 200);
  if (n < 2) return false;
  let zeros = 0;
  let count = 0;
  for (let i = 1; i < n; i += 2) {
    count++;
    if (bytes[i] === 0) zeros++;
  }
  return count > 0 && zeros / count > 0.3;
}

function replacementRatio(t: string): number {
  if (t.length === 0) return 0;
  let bad = 0;
  for (const ch of t) if (ch === "�") bad++;
  return bad / t.length;
}

/** Decode the outer Base64 to text. With `force`, use that encoding directly;
 * otherwise auto-detect UTF-16LE vs UTF-8 by content. */
export function decodeOuter(
  b64: string,
  force: OuterEncoding = "auto",
): { text: string; encoding: string } {
  const bytes = base64ToBytes(b64);
  if (force === "utf-16le") {
    return { text: new TextDecoder("utf-16le").decode(bytes), encoding: "UTF-16LE" };
  }
  if (force === "utf-8") {
    return { text: new TextDecoder("utf-8", { fatal: false }).decode(bytes), encoding: "UTF-8" };
  }
  if (looksUtf16le(bytes)) {
    return { text: new TextDecoder("utf-16le").decode(bytes), encoding: "UTF-16LE" };
  }
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  // Non-Latin UTF-16LE payloads (e.g. CJK) don't trip the zero-high-byte
  // heuristic, but decoding them as UTF-8 produces replacement characters.
  // Prefer UTF-16LE when it is both even-length and demonstrably cleaner - this
  // never fires for genuine UTF-8 text, which has no replacement characters.
  if (bytes.length % 2 === 0 && replacementRatio(utf8) > 0.1) {
    const utf16 = new TextDecoder("utf-16le").decode(bytes);
    if (replacementRatio(utf16) < replacementRatio(utf8)) {
      return { text: utf16, encoding: "UTF-16LE" };
    }
  }
  return { text: utf8, encoding: "UTF-8" };
}

async function decompress(bytes: Uint8Array<ArrayBuffer>, format: "gzip" | "deflate-raw"): Promise<Uint8Array> {
  const ds = new DecompressionStream(format);
  const writer = ds.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(buf);
}

/** Find an inner `FromBase64String("…")` payload and whether it's Gzip vs Deflate. */
function findInner(script: string): { b64: string; gzip: boolean } | null {
  const m = script.match(/FromBase64String\(\s*['"]([A-Za-z0-9+/=\s]+)['"]\s*\)/i);
  if (!m) return null;
  const b64 = m[1].replace(/\s+/g, "");
  if (b64.length < 16) return null;
  return { b64, gzip: /gzip/i.test(script) };
}

/**
 * Decode the encoded command. Returns one layer for the Base64→UTF-16LE script,
 * and a second layer if an inner Deflate/Gzip payload was found and unwrapped.
 */
export async function decodePowerShell(
  input: string,
  force: OuterEncoding = "auto",
): Promise<PsResult> {
  const b64 = extractBase64(input);
  if (!b64 || b64.length < 8) return { layers: [], error: "" };

  let outer: { text: string; encoding: string };
  try {
    outer = decodeOuter(b64, force);
  } catch {
    // Only surface an error when the blob actually looked like Base64 - a long
    // ordinary word shouldn't trigger a scary "could not decode" message.
    const looksB64 = b64.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(b64);
    return { layers: [], error: looksB64 ? "Could not Base64-decode the input." : "" };
  }

  const layers: PsLayer[] = [{ label: `Base64 → ${outer.encoding}`, text: outer.text }];

  const inner = findInner(outer.text);
  if (inner) {
    let bytes: Uint8Array<ArrayBuffer>;
    try {
      bytes = base64ToBytes(inner.b64);
    } catch {
      return { layers, error: "" };
    }
    // Try the format hinted by the script first, then the other.
    const order: ("gzip" | "deflate-raw")[] = inner.gzip
      ? ["gzip", "deflate-raw"]
      : ["deflate-raw", "gzip"];
    for (const fmt of order) {
      try {
        const out = await decompress(bytes, fmt);
        layers.push({
          label: `Inner FromBase64String → ${fmt === "gzip" ? "Gunzip" : "Raw Inflate"}`,
          text: new TextDecoder("utf-8").decode(out),
        });
        break;
      } catch {
        // try the next format
      }
    }
  }

  return { layers, error: "" };
}

function toUtf16LeBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[i * 2] = c & 0xff;
    out[i * 2 + 1] = (c >> 8) & 0xff;
  }
  return out;
}

/** Encode a script the way PowerShell `-EncodedCommand` expects: Base64 of the
 * UTF-16LE bytes. */
export function encodeToBase64(script: string): string {
  if (script === "") return "";
  const bytes = toUtf16LeBytes(script);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}
