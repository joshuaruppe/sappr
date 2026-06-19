/**
 * URL percent-encoding/decoding over the native (de|en)codeURI(Component)
 * functions. Pure functions — no DOM/React, safe for tests or a Web Worker.
 */

export type UrlScope = "component" | "full";

export interface UrlEncodeOptions {
  /** "component" => encodeURIComponent, "full" => encodeURI. */
  scope?: UrlScope;
  /** Replace %20 with + (form/application/x-www-form-urlencoded style). */
  plus?: boolean;
}

export interface UrlDecodeOptions {
  /** "component" => decodeURIComponent, "full" => decodeURI. */
  scope?: UrlScope;
  /** Treat + as a space before decoding (form style). */
  plus?: boolean;
}

export function encodeUrl(text: string, opts: UrlEncodeOptions = {}): string {
  if (text === "") return "";
  const scope = opts.scope ?? "component";
  let out = scope === "full" ? encodeURI(text) : encodeURIComponent(text);
  if (opts.plus) out = out.replace(/%20/g, "+");
  return out;
}

export function decodeUrl(input: string, opts: UrlDecodeOptions = {}): string {
  if (input === "") return "";
  const scope = opts.scope ?? "component";
  // In form encoding a literal '+' means space; encode any '+' that should
  // survive decoding as %20 first so they aren't mistaken for spaces.
  const s = opts.plus ? input.replace(/\+/g, "%20") : input;
  try {
    return scope === "full" ? decodeURI(s) : decodeURIComponent(s);
  } catch (e) {
    if (e instanceof URIError) {
      throw new Error("Could not decode (malformed percent-encoding).");
    }
    throw e;
  }
}
