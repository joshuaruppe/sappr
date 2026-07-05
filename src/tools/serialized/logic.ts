/**
 * Identify and (where cheap) decode serialized-object blobs seen in web apps:
 * Java serialized, JSF ViewState (Base64+Gzip), ASP.NET __VIEWSTATE, PHP
 * serialize(), Ruby Marshal and Python pickle. Detection is the point — it tells
 * a tester which deserialization attack applies. Client-side only.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export type FormatId =
  | "java"
  | "jsf"
  | "dotnet-viewstate"
  | "php"
  | "ruby"
  | "pickle"
  | "gzip"
  | "unknown"
  | null;

export interface SerializedResult {
  format: string;
  formatId: FormatId;
  /** How the input was read: base64 / hex / raw. */
  source?: string;
  /** Readable decoded content, when cheaply available (JSF, gzip, PHP). */
  decoded?: string;
  /** Printable strings pulled from a binary blob (Java, unknown). */
  strings?: string[];
  /** Hex preview of the first bytes. */
  hex?: string;
  findings: Finding[];
  error: string;
}

function bytesFromInput(input: string): { bytes: Uint8Array<ArrayBuffer>; source: string } {
  const t = input.trim();

  const hex = t.replace(/0x/gi, "").replace(/[\s:,-]/g, "");
  if (hex.length >= 8 && hex.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hex)) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return { bytes: out, source: "hex" };
  }

  const b64 = t.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (b64.length >= 4 && /^[A-Za-z0-9+/=]+$/.test(b64)) {
    try {
      const bin = atob(b64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return { bytes: out, source: "base64" };
    } catch {
      // fall through
    }
  }

  const out = new Uint8Array(t.length);
  for (let i = 0; i < t.length; i++) out[i] = t.charCodeAt(i) & 0xff;
  return { bytes: out, source: "raw" };
}

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const ds = new DecompressionStream("gzip");
  const w = ds.writable.getWriter();
  void w.write(bytes);
  void w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

function extractStrings(bytes: Uint8Array, min = 4): string[] {
  const out: string[] = [];
  let cur = "";
  for (const b of bytes) {
    if (b >= 0x20 && b <= 0x7e) {
      cur += String.fromCharCode(b);
    } else {
      if (cur.length >= min) out.push(cur);
      cur = "";
    }
  }
  if (cur.length >= min) out.push(cur);
  return out.slice(0, 40);
}

function hexPreview(bytes: Uint8Array, n = 48): string {
  return Array.from(bytes.subarray(0, n), (b) => b.toString(16).padStart(2, "0")).join(" ");
}

const JAVA_FINDING: Finding = {
  severity: "high",
  message: "Java serialized object — test for insecure deserialization (ysoserial gadget chains).",
};

export async function analyzeSerialized(input: string): Promise<SerializedResult> {
  const empty: SerializedResult = { format: "", formatId: null, findings: [], error: "" };
  const t = input.trim();
  if (t === "") return empty;

  // PHP serialize() is plain text.
  if (/^(a|O|s|i|b|d):[0-9]/.test(t) || /^N;/.test(t)) {
    return {
      format: "PHP serialize()",
      formatId: "php",
      decoded: t.replace(/;/g, ";\n").replace(/\{/g, "{\n"),
      findings: [
        { severity: "medium", message: "PHP serialized data — check for object injection / POP chains." },
      ],
      error: "",
    };
  }

  const { bytes, source } = bytesFromInput(input);
  const b = bytes;

  if (b.length >= 4 && b[0] === 0xac && b[1] === 0xed && b[2] === 0x00 && b[3] === 0x05) {
    return {
      format: "Java serialized object",
      formatId: "java",
      source,
      strings: extractStrings(b),
      hex: hexPreview(b),
      findings: [JAVA_FINDING],
      error: "",
    };
  }

  if (b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b) {
    try {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(await gunzip(b));
      const isXml = text.trimStart().startsWith("<");
      return {
        format: isXml ? "JSF ViewState (Base64 + Gzip)" : "Gzip-compressed data",
        formatId: isXml ? "jsf" : "gzip",
        source,
        decoded: text,
        findings: isXml
          ? [{ severity: "medium", message: "JSF ViewState — if unsigned, vulnerable to Java deserialization." }]
          : [],
        error: "",
      };
    } catch {
      // not gzip after all
    }
  }

  if (b.length >= 2 && b[0] === 0xff && b[1] === 0x01) {
    return {
      format: "ASP.NET __VIEWSTATE (LOSFormatter)",
      formatId: "dotnet-viewstate",
      source,
      strings: extractStrings(b),
      hex: hexPreview(b),
      findings: [
        {
          severity: "high",
          message:
            "ASP.NET ViewState — if MAC is disabled or the machineKey is known, this deserializes to RCE (ysoserial.net).",
        },
      ],
      error: "",
    };
  }

  if (b.length >= 2 && b[0] === 0x04 && b[1] === 0x08) {
    return {
      format: "Ruby Marshal",
      formatId: "ruby",
      source,
      strings: extractStrings(b),
      hex: hexPreview(b),
      findings: [{ severity: "high", message: "Ruby Marshal data — insecure deserialization risk." }],
      error: "",
    };
  }

  if (b.length >= 2 && b[0] === 0x80 && b[1] >= 0x02 && b[1] <= 0x05) {
    return {
      format: `Python pickle (protocol ${b[1]})`,
      formatId: "pickle",
      source,
      strings: extractStrings(b),
      hex: hexPreview(b),
      findings: [
        {
          severity: "high",
          message: "Python pickle — unpickling untrusted data executes arbitrary code (__reduce__).",
        },
      ],
      error: "",
    };
  }

  return {
    format: "Unknown / unrecognized",
    formatId: "unknown",
    source,
    strings: extractStrings(b),
    hex: hexPreview(b),
    findings: [],
    error: "",
  };
}
