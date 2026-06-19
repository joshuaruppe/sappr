/**
 * Run a JavaScript regular expression against text and collect every match
 * (with capture groups). Pure functions — no DOM/React.
 */

export interface RegexMatch {
  /** The full matched substring. */
  match: string;
  /** Start index of the match within the input text. */
  index: number;
  /** Numbered capture groups (1-based in the regex; here 0-based array). */
  groups: (string | undefined)[];
  /** Named capture groups, when the pattern uses (?<name>...). */
  namedGroups?: Record<string, string>;
}

export interface RegexResult {
  matches: RegexMatch[];
  error?: string;
}

/**
 * Compile and run `pattern` with `flags` over `text`, returning all matches.
 *
 * The `g` flag is forced internally so we can enumerate every match, but the
 * user's flags are still applied for matching semantics (i, m, s, u, y, and
 * whether they asked for `g` at all — without it we only return the first).
 */
export function runRegex(
  pattern: string,
  flags: string,
  text: string,
): RegexResult {
  if (pattern === "") return { matches: [] };

  const userWantsGlobal = flags.includes("g");
  // Force global iteration so we can walk the string; preserve other flags.
  const effectiveFlags = flags.includes("g") ? flags : flags + "g";

  let re: RegExp;
  try {
    re = new RegExp(pattern, effectiveFlags);
  } catch (e) {
    return { matches: [], error: e instanceof Error ? e.message : String(e) };
  }

  const matches: RegexMatch[] = [];
  if (text === "") return { matches };

  try {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const [full, ...rest] = m;
      const entry: RegexMatch = {
        match: full,
        index: m.index,
        groups: rest,
      };
      if (m.groups) {
        const named: Record<string, string> = {};
        for (const [k, v] of Object.entries(m.groups)) {
          if (v !== undefined) named[k] = v;
        }
        if (Object.keys(named).length > 0) entry.namedGroups = named;
      }
      matches.push(entry);

      // Guard against zero-length matches causing an infinite loop. Under the
      // unicode (`u`) flag, advance a whole code point so we never land in the
      // middle of a surrogate pair — which the engine would snap back from,
      // re-matching the same index forever and hanging the tab on astral input.
      if (m.index === re.lastIndex) {
        if (re.unicode) {
          const cp = text.codePointAt(re.lastIndex);
          re.lastIndex += cp !== undefined && cp > 0xffff ? 2 : 1;
        } else {
          re.lastIndex++;
        }
      }

      // If the user didn't ask for global, stop after the first match.
      if (!userWantsGlobal) break;
    }
  } catch (e) {
    return { matches, error: e instanceof Error ? e.message : String(e) };
  }

  return { matches };
}
