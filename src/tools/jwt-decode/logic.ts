/**
 * Decode (NOT verify) a JSON Web Token.
 *
 * A JWT is `<header>.<payload>.<signature>`, where the header and payload are
 * base64url-encoded JSON objects. This module splits the token, base64url-decodes
 * the first two segments into JSON, and surfaces the standard registered claims.
 *
 * Pure functions — no DOM/React; safe to call from a Web Worker or a test.
 * The signature is never checked: this is decode-only.
 */

export type ExpiryStatus = "valid" | "expired" | "not-yet-valid" | "unknown";

export interface JwtClaim {
  /** Claim key, e.g. "exp". */
  key: string;
  /** Raw numeric value (seconds since the Unix epoch). */
  raw: number;
  /** Human-readable UTC rendering of the timestamp. */
  utc: string;
}

export interface DecodedJwt {
  /** Pretty-printed header JSON. */
  headerJson: string;
  /** Pretty-printed payload JSON. */
  payloadJson: string;
  /** Parsed header object. */
  header: Record<string, unknown>;
  /** Parsed payload object. */
  payload: Record<string, unknown>;
  /** `alg` from the header, if present. */
  alg?: string;
  /** `typ` from the header, if present. */
  typ?: string;
  /** Time-based standard claims found in the payload, decoded to UTC. */
  timeClaims: JwtClaim[];
  /** Expiry status computed from exp/nbf against the supplied time. */
  expiry: ExpiryStatus;
}

/** Base64url-decode a string to raw bytes (manual, no atob alphabet helper). */
function base64UrlToBytes(input: string): Uint8Array {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  const mod = s.length % 4;
  if (mod === 1) {
    throw new Error("Invalid base64url length in token segment.");
  }
  if (mod === 2) s += "==";
  else if (mod === 3) s += "=";

  let bin: string;
  try {
    bin = atob(s);
  } catch {
    throw new Error("Token segment is not valid base64url.");
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Base64url-decode a JWT segment into a parsed JSON object. */
function decodeSegment(segment: string, name: string): Record<string, unknown> {
  const bytes = base64UrlToBytes(segment);
  const text = new TextDecoder("utf-8").decode(bytes);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`Token ${name} is not valid JSON.`);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Token ${name} is not a JSON object.`);
  }
  return value as Record<string, unknown>;
}

/** Format a numeric (seconds) Unix timestamp as a readable UTC string. */
export function formatUtc(seconds: number): string {
  const d = new Date(seconds * 1000);
  if (Number.isNaN(d.getTime())) return "invalid date";
  return d.toUTCString();
}

const TIME_CLAIM_KEYS = ["iat", "nbf", "exp", "auth_time"] as const;

/**
 * Decode a JWT into its header, payload, standard claims and expiry status.
 * @param token  the compact JWT string
 * @param now    current time in ms (defaults to Date.now()); used for expiry
 */
export function decodeJwt(token: string, now: number = Date.now()): DecodedJwt {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error("No token provided.");
  }

  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    throw new Error(
      `A JWT must have 3 dot-separated parts; got ${parts.length}.`,
    );
  }
  if (parts.some((p) => p === "")) {
    throw new Error("A JWT must not have empty segments.");
  }

  const header = decodeSegment(parts[0], "header");
  const payload = decodeSegment(parts[1], "payload");

  const timeClaims: JwtClaim[] = [];
  for (const key of TIME_CLAIM_KEYS) {
    const v = payload[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      timeClaims.push({ key, raw: v, utc: formatUtc(v) });
    }
  }

  let expiry: ExpiryStatus = "unknown";
  const nowSec = now / 1000;
  const exp = payload.exp;
  const nbf = payload.nbf;
  if (typeof nbf === "number" && Number.isFinite(nbf) && nowSec < nbf) {
    expiry = "not-yet-valid";
  } else if (typeof exp === "number" && Number.isFinite(exp)) {
    expiry = nowSec >= exp ? "expired" : "valid";
  } else if (typeof nbf === "number" && Number.isFinite(nbf)) {
    // nbf passed but no exp present.
    expiry = "valid";
  }

  return {
    headerJson: JSON.stringify(header, null, 2),
    payloadJson: JSON.stringify(payload, null, 2),
    header,
    payload,
    alg: typeof header.alg === "string" ? header.alg : undefined,
    typ: typeof header.typ === "string" ? header.typ : undefined,
    timeClaims,
    expiry,
  };
}
