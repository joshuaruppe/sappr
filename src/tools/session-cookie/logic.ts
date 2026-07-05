/**
 * Decode signed web-app session cookies without the secret: Flask / itsdangerous
 * (optionally zlib-compressed), a JWT stored in a cookie, and Django's
 * colon-separated signed values. These are SIGNED, not encrypted — the payload
 * is readable (and forgeable if the secret is weak). Client-side only.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export type CookieType = "flask" | "jwt" | "django" | "base64" | null;

export interface CookieResult {
  type: CookieType;
  typeLabel: string;
  /** Decoded payload (pretty JSON when it parses as JSON). */
  payload: string;
  /** JWT header, when the cookie is a JWT. */
  header?: string;
  /** Signing time (Flask/itsdangerous), when decodable. */
  timestamp?: string;
  compressed?: boolean;
  findings: Finding[];
  error: string;
}

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = t.length % 4;
  if (pad === 2) t += "==";
  else if (pad === 3) t += "=";
  const bin = atob(t);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function zlibInflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const w = ds.writable.getWriter();
  void w.write(bytes);
  void w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

const SIGNED_NOTE: Finding = {
  severity: "info",
  message:
    "Signed, not encrypted — the payload is readable as-is, and can be forged if the signing secret is weak or leaked.",
};

/** Decode a session cookie, auto-detecting its format. */
export async function decodeCookie(input: string): Promise<CookieResult> {
  const empty: CookieResult = { type: null, typeLabel: "", payload: "", findings: [], error: "" };
  let s = input.trim();
  if (s === "") return empty;

  // Strip a leading "cookiename=" (document.cookie / Set-Cookie style).
  const eq = s.indexOf("=");
  if (eq > 0 && eq < 40 && !s.slice(0, eq).includes(".")) {
    const rest = s.slice(eq + 1).trim();
    if (rest.includes(".") || rest.includes(":")) s = rest;
  }
  s = s.replace(/;.*$/, "").trim(); // drop trailing cookie attributes

  const dotParts = s.split(".");

  // JWT: 3 base64url parts whose header decodes to an object with `alg`.
  if (dotParts.length === 3 && !s.startsWith(".")) {
    let header: Record<string, unknown> | null = null;
    try {
      const h = JSON.parse(new TextDecoder().decode(b64urlToBytes(dotParts[0])));
      if (h && typeof h === "object" && "alg" in h) header = h as Record<string, unknown>;
    } catch {
      // header isn't a JWT header
    }
    if (header) {
      // Commit to JWT once the header is valid — don't let a malformed payload
      // segment fall through and get mislabeled as Flask/Django below.
      const findings: Finding[] = [SIGNED_NOTE];
      if (String(header.alg).toLowerCase() === "none") {
        findings.push({ severity: "high", message: "JWT alg: none — unsigned; trivially forgeable if accepted." });
      }
      let payload = "";
      try {
        payload = new TextDecoder().decode(b64urlToBytes(dotParts[1]));
      } catch {
        findings.push({
          severity: "medium",
          message: "Payload segment is not valid base64url — the token is malformed or truncated.",
        });
      }
      return {
        type: "jwt",
        typeLabel: "JWT (in cookie)",
        header: JSON.stringify(header, null, 2),
        payload: payload ? prettyJson(payload) : "",
        findings,
        error: "",
      };
    }
  }

  // Flask / itsdangerous: payload.timestamp.signature, optionally zlib-compressed
  // (a leading "." marks a compressed payload).
  const compressed = s.startsWith(".");
  const flaskParts = compressed ? s.slice(1).split(".") : dotParts;
  if (flaskParts.length === 3) {
    try {
      const raw = b64urlToBytes(flaskParts[0]);
      const bytes = compressed ? await zlibInflate(raw) : raw;
      const text = new TextDecoder().decode(bytes);
      if (isJson(text)) {
        let timestamp: string | undefined;
        try {
          const tb = b64urlToBytes(flaskParts[1]);
          let n = 0n;
          for (const b of tb) n = (n << 8n) | BigInt(b);
          const secs = Number(n);
          if (secs > 1_000_000_000 && secs < 4_000_000_000) {
            timestamp = new Date(secs * 1000).toISOString();
          }
        } catch {
          // timestamp not decodable
        }
        return {
          type: "flask",
          typeLabel: `Flask / itsdangerous${compressed ? " (zlib-compressed)" : ""}`,
          payload: prettyJson(text),
          timestamp,
          compressed,
          findings: [SIGNED_NOTE],
          error: "",
        };
      }
    } catch {
      // not Flask
    }
  }

  // Django signed value: value:timestamp:signature. Django session cookies hold
  // base64(JSON) in the value, so require the decoded value to be JSON — this
  // stops arbitrary "a:b:c" strings from being confidently labeled as Django.
  const colonParts = s.split(":");
  if (colonParts.length === 3) {
    try {
      const text = new TextDecoder().decode(b64urlToBytes(colonParts[0]));
      if (isJson(text)) {
        return {
          type: "django",
          typeLabel: "Django signed value",
          payload: prettyJson(text),
          findings: [SIGNED_NOTE],
          error: "",
        };
      }
    } catch {
      // not Django
    }
  }

  // Fallback: plain base64 / base64url.
  try {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(b64urlToBytes(s));
    if (text.replace(/[^\x20-\x7e]/g, "").length > text.length * 0.7) {
      return {
        type: "base64",
        typeLabel: "Base64 (unknown scheme)",
        payload: prettyJson(text),
        findings: [],
        error: "",
      };
    }
  } catch {
    // not base64
  }

  return { ...empty, error: "Could not recognize the cookie (Flask, JWT, Django or Base64)." };
}
