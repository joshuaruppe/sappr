/**
 * Defang / refang indicators of compromise, and extract IOCs from a blob.
 *
 * Defanging rewrites live indicators into an inert form (hxxp, [.], [@]) so they
 * can be pasted into reports, tickets and email without becoming clickable or
 * resolvable. Refanging reverses the common notations back to live form. Extract
 * refangs first, then pulls URLs, IPs, domains, emails and file hashes out of
 * arbitrary text. All pure string work — no network, no DOM.
 */

/** Rewrite live IOCs into an inert, shareable form. */
export function defang(input: string): string {
  return input
    .replace(/http(s?)/gi, "hxxp$1") // http → hxxp, https → hxxps
    .replace(/:\/\//g, "[://]")
    .replace(/\./g, "[.]")
    .replace(/@/g, "[@]");
}

/**
 * Reverse the common defang notations back to a live IOC. Only the delimited
 * forms ([.], (.), {.}, [dot], _dot_, \., hxxp, [@], [at], [://]) are reversed —
 * bare "dot"/"at" words are deliberately left alone so ordinary prose isn't
 * mangled.
 */
export function refang(input: string): string {
  return (
    input
      // scheme
      .replace(/h\s*xx\s*p/gi, "http") // hxxp → http (so hxxps → https)
      // :// and : wrappers
      .replace(/[[({]\s*:\s*\/\s*\/\s*[)\]}]/g, "://")
      .replace(/[[({]\s*:\s*[)\]}]/g, ":")
      // dots
      .replace(/[[({]\s*\.\s*[)\]}]/g, ".")
      .replace(/[[({]\s*dot\s*[)\]}]/gi, ".")
      .replace(/_dot_/gi, ".")
      .replace(/\\\./g, ".")
      // slashes
      .replace(/[[({]\s*\/\s*[)\]}]/g, "/")
      // at
      .replace(/[[({]\s*@\s*[)\]}]/g, "@")
      .replace(/[[({]\s*at\s*[)\]}]/gi, "@")
      .replace(/_at_/gi, "@")
  );
}

export interface IocResult {
  urls: string[];
  ipv4: string[];
  ipv6: string[];
  domains: string[];
  emails: string[];
  hashes: string[];
}

function uniq(xs: string[]): string[] {
  return [...new Set(xs)];
}

function validIpv4(ip: string): boolean {
  const parts = ip.split(".");
  return parts.length === 4 && parts.every((p) => Number(p) <= 255);
}

const URL_RE = /\bhttps?:\/\/[^\s"'`<>()[\]{}]+/gi;
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6_RE = /\b(?:[a-f0-9]{1,4}:){2,7}[a-f0-9]{1,4}\b|::(?:[a-f0-9]{1,4}:){0,6}[a-f0-9]{1,4}/gi;
const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;
const DOMAIN_RE = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
const HASH_RE = /\b[a-f0-9]{64}\b|\b[a-f0-9]{40}\b|\b[a-f0-9]{32}\b/gi;

/** Refang the input, then extract IOCs by type. */
export function extractIocs(input: string): IocResult {
  const text = refang(input);
  const match = (re: RegExp) => uniq(text.match(re) ?? []);

  const urls = match(URL_RE).map((u) => u.replace(/[.,;:)\]}'"]+$/, "")); // trim trailing punctuation
  const ipv4 = uniq(match(IPV4_RE).filter(validIpv4));
  const ipv6 = match(IPV6_RE);
  const emails = match(EMAIL_RE);
  const hashes = match(HASH_RE).map((h) => h.toLowerCase());

  // Drop domains already accounted for inside an extracted URL or email, to cut
  // noise (the host of a URL isn't a separate finding).
  const domains = match(DOMAIN_RE).filter(
    (d) => !urls.some((u) => u.includes(d)) && !emails.some((e) => e.includes(d)),
  );

  return { urls, ipv4, ipv6, domains, emails, hashes: uniq(hashes) };
}
