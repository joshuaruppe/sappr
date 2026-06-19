/**
 * Parse a URL into its components using the native `URL` API.
 * Pure functions — no DOM/React; safe to call from a Web Worker or a test.
 */

export interface QueryParam {
  key: string;
  value: string;
}

export interface ParsedUrl {
  href: string;
  protocol: string;
  username: string;
  password: string;
  host: string;
  hostname: string;
  port: string;
  origin: string;
  pathname: string;
  search: string;
  hash: string;
  params: QueryParam[];
}

/**
 * Returns true when the input has no URL scheme (e.g. "example.com/x")
 * but looks like it could be a bare host we can prefix with https://.
 * Protocol-relative input ("//host/x") and inputs with an existing scheme
 * are left untouched.
 */
function looksSchemeless(str: string): boolean {
  const s = str.trim();
  if (s === "") return false;
  if (s.startsWith("//")) return false; // protocol-relative
  // Anything with an authority delimiter is attempting to be a full URL — if its
  // scheme is malformed (e.g. "ht!tp://x"), let it error rather than rescuing it.
  if (s.includes("://")) return false;
  // A scheme is letters/digits/+/-/. followed by ':' (e.g. "https:", "mailto:").
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return false;
  return true;
}

/**
 * Best-effort normalization for predictable parsing:
 * - protocol-relative input ("//host/x") gets an "https:" scheme
 * - scheme-less but host-like input ("host/x") gets "https://"
 * Anything that already has a scheme is returned unchanged.
 */
export function normalizeUrlInput(str: string): string {
  const s = str.trim();
  if (s === "") return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (looksSchemeless(s)) return `https://${s}`;
  return s;
}

/**
 * Parse a URL into its components. Tries the input as-is first, then falls
 * back to a normalized form (prefixing https:// for scheme-less host-like
 * input). Throws a friendly error if neither parses.
 */
export function parseUrl(str: string): ParsedUrl {
  let url: URL;
  try {
    url = new URL(str);
  } catch {
    const normalized = normalizeUrlInput(str);
    try {
      url = new URL(normalized);
    } catch {
      throw new Error("Not a valid URL.");
    }
  }

  const params: QueryParam[] = [];
  url.searchParams.forEach((value, key) => {
    // URLSearchParams already returns decoded values.
    params.push({ key, value });
  });

  return {
    href: url.href,
    protocol: url.protocol,
    username: url.username,
    password: url.password,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    origin: url.origin,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    params,
  };
}
