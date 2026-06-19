/**
 * HTML entity encode/decode built on the `he` library.
 * Pure functions — no DOM/React, safe to call from a Web Worker or a test.
 */
import he from "he";

export interface HtmlEntitiesEncodeOptions {
  /** Use named character references (e.g. &amp;) where available. */
  useNamedReferences?: boolean;
  /** Encode every character, not just unsafe ones. */
  encodeEverything?: boolean;
}

export function encodeHtmlEntities(
  text: string,
  opts: HtmlEntitiesEncodeOptions = {},
): string {
  return he.encode(text, {
    // Default to named references (e.g. &lt;) — matches the tool's UI default
    // and is the more human-readable choice.
    useNamedReferences: opts.useNamedReferences ?? true,
    encodeEverything: opts.encodeEverything ?? false,
  });
}

export function decodeHtmlEntities(input: string): string {
  return he.decode(input);
}
