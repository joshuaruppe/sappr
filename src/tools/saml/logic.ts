/**
 * Decode and encode SAML messages (AuthnRequest / Response). The HTTP-Redirect
 * binding DEFLATE-compresses then Base64-encodes (and URL-encodes) the XML; the
 * HTTP-POST binding only Base64-encodes it. Decoding auto-detects which.
 * Client-side only (uses the browser Compression/DecompressionStream).
 */

export interface SamlDecodeResult {
  xml: string;
  binding: string;
  error: string;
}

export interface SamlEncodeResult {
  /** DEFLATE + Base64 + URL-encoded (HTTP-Redirect binding). */
  redirect: string;
  /** Base64 only (HTTP-POST binding). */
  post: string;
  error: string;
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function utf8Bytes(s: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder().encode(s);
  const out = new Uint8Array(enc.length);
  out.set(enc);
  return out;
}

async function inflateRaw(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const w = ds.writable.getWriter();
  void w.write(bytes);
  void w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

async function deflateRaw(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate-raw");
  const w = cs.writable.getWriter();
  void w.write(bytes);
  void w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

/** A light XML pretty-printer (indent by tag depth). */
export function prettyXml(xml: string): string {
  const oneLine = xml.replace(/\r?\n\s*/g, "").trim();
  const tokens = oneLine.replace(/>\s*</g, ">\n<").split("\n");
  let pad = 0;
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const isClosing = /^<\//.test(tok);
    const isSelfContained = /^<[^>]+>[^<]*<\/[^>]+>$/.test(tok); // <a>text</a> on one line
    const isSelfClosing = /\/>$/.test(tok);
    const isOpening = /^<[^/!?]/.test(tok) && !isSelfContained && !isSelfClosing;
    // Collapse an empty element written as a pair - <a></a> - onto one line
    // instead of splitting it across two indented lines.
    if (isOpening) {
      const next = tokens[i + 1];
      const openName = tok.match(/^<([^\s/>]+)/)?.[1];
      const closeName = next?.match(/^<\/([^\s>]+)>?$/)?.[1];
      if (openName && closeName && openName === closeName) {
        out.push("  ".repeat(pad) + tok + next);
        i += 1;
        continue;
      }
    }
    if (isClosing) pad = Math.max(0, pad - 1);
    out.push("  ".repeat(pad) + tok);
    if (isOpening) pad += 1;
  }
  return out.join("\n");
}

/** Decode a SAML message, auto-detecting the binding. */
export async function decodeSaml(input: string): Promise<SamlDecodeResult> {
  const empty: SamlDecodeResult = { xml: "", binding: "", error: "" };
  let s = input.trim();
  if (s === "") return empty;

  // Redirect-binding values arrive URL-encoded.
  if (/%[0-9a-fA-F]{2}/.test(s)) {
    try {
      s = decodeURIComponent(s);
    } catch {
      // keep the original
    }
  }

  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = base64ToBytes(s);
  } catch {
    return { ...empty, error: "Input is not valid Base64." };
  }

  // HTTP-POST binding: the Base64 already holds XML. Allow a leading UTF-8 BOM
  // (EF BB BF) before the '<' - TextDecoder strips it during decode.
  const xmlStart =
    bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  if (bytes[xmlStart] === 0x3c) {
    const xml = new TextDecoder("utf-8").decode(bytes);
    return { xml: prettyXml(xml), binding: "HTTP-POST (Base64)", error: "" };
  }

  // HTTP-Redirect binding: DEFLATE-compressed.
  try {
    const xml = new TextDecoder("utf-8").decode(await inflateRaw(bytes));
    if (xml.trimStart().startsWith("<")) {
      return { xml: prettyXml(xml), binding: "HTTP-Redirect (DEFLATE + Base64)", error: "" };
    }
  } catch {
    // not raw-deflate
  }

  return {
    ...empty,
    error: "Could not decode as SAML - expected Base64 XML, or DEFLATE + Base64.",
  };
}

/** Encode XML into both SAML bindings. */
export async function encodeSaml(xml: string): Promise<SamlEncodeResult> {
  const empty: SamlEncodeResult = { redirect: "", post: "", error: "" };
  const trimmed = xml.trim();
  if (trimmed === "") return empty;

  const bytes = utf8Bytes(trimmed);
  const post = bytesToBase64(bytes);
  try {
    const redirect = encodeURIComponent(bytesToBase64(await deflateRaw(bytes)));
    return { redirect, post, error: "" };
  } catch {
    return { ...empty, error: "Compression failed." };
  }
}
