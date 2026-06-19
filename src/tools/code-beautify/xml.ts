/**
 * A small, dependency-free XML / markup beautifier.
 *
 * Prettier has no built-in XML parser and the third-party plugin is heavy and
 * browser-finicky, so we tokenize and re-indent ourselves. The tokenizer is
 * quote-aware (so `>` inside attribute values doesn't end a tag) and protects
 * comments, CDATA, processing instructions and declarations from being split.
 *
 * It's a *formatter*, not a validator — malformed input is re-indented
 * best-effort rather than rejected.
 */

export interface XmlFormatOptions {
  /** Spaces per indent level. */
  tabWidth?: number;
}

/** Split XML into an ordered list of markup + text tokens. */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const n = input.length;
  let i = 0;

  while (i < n) {
    if (input.startsWith("<!--", i)) {
      const end = input.indexOf("-->", i);
      const stop = end === -1 ? n : end + 3;
      tokens.push(input.slice(i, stop));
      i = stop;
    } else if (input.startsWith("<![CDATA[", i)) {
      const end = input.indexOf("]]>", i);
      const stop = end === -1 ? n : end + 3;
      tokens.push(input.slice(i, stop));
      i = stop;
    } else if (input.startsWith("<?", i)) {
      const end = input.indexOf("?>", i);
      const stop = end === -1 ? n : end + 2;
      tokens.push(input.slice(i, stop));
      i = stop;
    } else if (input.startsWith("<!", i)) {
      // DOCTYPE / other declaration
      const end = input.indexOf(">", i);
      const stop = end === -1 ? n : end + 1;
      tokens.push(input.slice(i, stop));
      i = stop;
    } else if (input[i] === "<") {
      // A tag: scan to the matching ">", skipping quoted attribute values.
      let j = i + 1;
      let quote = "";
      while (j < n) {
        const c = input[j];
        if (quote) {
          if (c === quote) quote = "";
        } else if (c === '"' || c === "'") {
          quote = c;
        } else if (c === ">") {
          j++;
          break;
        }
        j++;
      }
      tokens.push(input.slice(i, j));
      i = j;
    } else {
      // Text run up to the next tag.
      const next = input.indexOf("<", i);
      const stop = next === -1 ? n : next;
      tokens.push(input.slice(i, stop));
      i = stop;
    }
  }

  return tokens;
}

const isMarkup = (t: string) => t.startsWith("<");
const isSpecial = (t: string) =>
  t.startsWith("<!--") ||
  t.startsWith("<![CDATA[") ||
  t.startsWith("<?") ||
  t.startsWith("<!");
const isClosing = (t: string) => t.startsWith("</");
const isSelfClosing = (t: string) => /\/\s*>$/.test(t);

/** Pretty-print XML by re-indenting on element depth. */
export function formatXml(input: string, opts: XmlFormatOptions = {}): string {
  const src = input.trim();
  if (!src) return "";

  const unit = " ".repeat(opts.tabWidth ?? 2);
  const pad = (d: number) => unit.repeat(Math.max(0, d));
  const tokens = tokenize(src);
  const out: string[] = [];
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (!isMarkup(token)) {
      const text = token.trim();
      if (text) out.push(pad(depth) + text);
      continue;
    }

    if (isSpecial(token)) {
      out.push(pad(depth) + token.trim());
      continue;
    }

    if (isClosing(token)) {
      depth = Math.max(0, depth - 1);
      out.push(pad(depth) + token.trim());
      continue;
    }

    if (isSelfClosing(token)) {
      out.push(pad(depth) + token.trim());
      continue;
    }

    // Opening tag — keep simple element bodies on one line where we can.
    const a = tokens[i + 1];
    const b = tokens[i + 2];
    if (a !== undefined && isClosing(a)) {
      // <tag></tag>
      out.push(pad(depth) + token.trim() + a.trim());
      i += 1;
    } else if (a !== undefined && !isMarkup(a) && b !== undefined && isClosing(b)) {
      // <tag>text</tag>
      out.push(pad(depth) + token.trim() + a.trim() + b.trim());
      i += 2;
    } else {
      out.push(pad(depth) + token.trim());
      depth += 1;
    }
  }

  return out.join("\n");
}
