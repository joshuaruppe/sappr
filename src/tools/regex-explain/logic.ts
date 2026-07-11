/**
 * Explain a regular expression in plain English by walking its AST.
 * Pure functions - no DOM/React. Uses `regexp-tree` to parse the pattern.
 */
import { parse } from "regexp-tree";
import type {
  AstRegExp,
  Expression,
  Char,
  CharacterClass,
  ClassRange,
  Quantifier,
} from "regexp-tree/ast";

/** A node in the human-readable explanation tree. */
export interface ExplainNode {
  /** Short bold label for this node, e.g. `"a"` or `"Group"`. */
  label: string;
  /** Optional muted detail, e.g. `"one or more (greedy)"`. */
  detail?: string;
  /** Nested sub-explanations. */
  children?: ExplainNode[];
}

/** Result of {@link explainRegex}: either a tree or a parse error. */
export interface ExplainResult {
  tree?: ExplainNode;
  error?: string;
}

/** Quote a short string for display inside a label. */
function quote(value: string): string {
  return `"${value}"`;
}

/** Describe a single Char node (literal or meta/special). */
function describeChar(node: Char): ExplainNode {
  if (node.kind === "meta") {
    const meta: Record<string, string> = {
      ".": "any character (except newline)",
      "\\d": "any digit (0-9)",
      "\\D": "any non-digit",
      "\\w": "any word character (a-z, A-Z, 0-9, _)",
      "\\W": "any non-word character",
      "\\s": "any whitespace",
      "\\S": "any non-whitespace",
      "\\n": "a newline",
      "\\r": "a carriage return",
      "\\t": "a tab",
      "\\f": "a form feed",
      "\\v": "a vertical tab",
      "\\0": "a null character",
    };
    return {
      label: node.value,
      detail: meta[node.value] ?? "a meta character",
    };
  }
  if (node.kind === "control") {
    return { label: node.value, detail: "a control character" };
  }
  if (node.kind === "hex" || node.kind === "unicode") {
    return {
      label: node.value,
      detail: `the character U+${node.codePoint
        .toString(16)
        .toUpperCase()
        .padStart(4, "0")}`,
    };
  }
  // simple / decimal / oct literal
  return { label: quote(node.value), detail: "the literal character" };
}

/** Describe an entry inside a character class (a single char or a range). */
function describeClassEntry(entry: Char | ClassRange): ExplainNode {
  if (entry.type === "ClassRange") {
    return {
      label: `${entry.from.value}-${entry.to.value}`,
      detail: `any character from ${quote(entry.from.value)} to ${quote(
        entry.to.value,
      )}`,
    };
  }
  return describeChar(entry);
}

/** Describe a [...] / [^...] character class. */
function describeCharacterClass(node: CharacterClass): ExplainNode {
  return {
    label: "Character class",
    detail: node.negative
      ? "none of the following"
      : "any one of the following",
    children: node.expressions.map(describeClassEntry),
  };
}

/** Turn a quantifier into a readable phrase, e.g. "one or more (greedy)". */
function describeQuantifier(q: Quantifier): string {
  let base: string;
  if (q.kind === "Range") {
    const { from, to } = q;
    if (to === undefined) {
      base = `${from} or more times`;
    } else if (from === to) {
      base = `exactly ${from} time${from === 1 ? "" : "s"}`;
    } else {
      base = `between ${from} and ${to} times`;
    }
  } else if (q.kind === "+") {
    base = "one or more times";
  } else if (q.kind === "*") {
    base = "zero or more times";
  } else {
    base = "optional (zero or one time)";
  }
  return `${base} (${q.greedy ? "greedy" : "lazy"})`;
}

/** Recursively explain any expression node. */
function describeExpression(node: Expression | null): ExplainNode {
  if (node === null) {
    return { label: "(empty)", detail: "matches the empty string" };
  }

  switch (node.type) {
    case "Char":
      return describeChar(node);

    case "CharacterClass":
      return describeCharacterClass(node);

    case "Alternative":
      return {
        label: "Sequence",
        detail: "match the following in order",
        children: node.expressions.map(describeExpression),
      };

    case "Disjunction":
      return {
        label: "Alternation",
        detail: "match one of the following",
        children: [
          describeExpression(node.left),
          describeExpression(node.right),
        ],
      };

    case "Group": {
      let detail: string;
      if (node.capturing) {
        detail = node.name
          ? `named capturing group "${node.name}"`
          : `capturing group #${node.number}`;
      } else {
        detail = "non-capturing group";
      }
      return {
        label: "Group",
        detail,
        children: [describeExpression(node.expression)],
      };
    }

    case "Backreference":
      return {
        label: "Backreference",
        detail:
          node.kind === "name"
            ? `matches what named group "${node.reference}" captured`
            : `matches what group #${node.reference} captured`,
      };

    case "Assertion": {
      switch (node.kind) {
        case "^":
          return { label: "^", detail: "start of input (or line)" };
        case "$":
          return { label: "$", detail: "end of input (or line)" };
        case "\\b":
          return { label: "\\b", detail: "a word boundary" };
        case "\\B":
          return { label: "\\B", detail: "a non-word boundary" };
        case "Lookahead":
          return {
            label: "Lookahead",
            detail: node.negative
              ? "not followed by"
              : "followed by",
            children: [describeExpression(node.assertion)],
          };
        case "Lookbehind":
          return {
            label: "Lookbehind",
            detail: node.negative
              ? "not preceded by"
              : "preceded by",
            children: [describeExpression(node.assertion)],
          };
      }
      break;
    }

    case "Repetition":
      return {
        label: "Repetition",
        detail: describeQuantifier(node.quantifier),
        children: [describeExpression(node.expression)],
      };
  }

  // Should be unreachable for valid ASTs; surface a generic node.
  return { label: (node as { type: string }).type, detail: "expression" };
}

/** Build the root explanation for a parsed regexp. */
function describeRoot(ast: AstRegExp): ExplainNode {
  const flags = ast.flags
    ? `flags: ${ast.flags.split("").join(", ")}`
    : "no flags";
  return {
    label: "Regular expression",
    detail: flags,
    children: [describeExpression(ast.body)],
  };
}

/** Noun phrases for common Unicode property / general-category names. */
const UNICODE_PROPERTY_NAMES: Record<string, string> = {
  L: "a letter",
  Lu: "an uppercase letter",
  Ll: "a lowercase letter",
  Lt: "a titlecase letter",
  Lm: "a modifier letter",
  Lo: "a letter without case",
  N: "a number",
  Nd: "a decimal digit",
  Nl: "a letter-number",
  No: "an other number",
  P: "a punctuation character",
  S: "a symbol",
  Sc: "a currency symbol",
  Sm: "a math symbol",
  Z: "a separator/space",
  Zs: "a space separator",
  M: "a combining mark",
  C: "a control/other character",
  Cc: "a control character",
  Alphabetic: "an alphabetic character",
  White_Space: "a whitespace character",
  Emoji: "an emoji code point",
};

function describeProperty(name: string): string {
  const key = name
    .replace(/^(General_Category|gc|Script|sc|Script_Extensions)\s*=\s*/i, "")
    .trim();
  const known = UNICODE_PROPERTY_NAMES[key];
  if (known) return known;
  if (/^[A-Za-z_]+$/.test(key)) return `in the "${key}" script/property`;
  return `the Unicode property ${name}`;
}

/**
 * Explain a regex pattern + flags as a nested {@link ExplainNode} tree.
 * Empty pattern returns an empty result (no tree, no error).
 * Invalid patterns return `{ error }`.
 */
export function explainRegex(pattern: string, flags: string): ExplainResult {
  if (pattern === "") return {};
  const props = [...pattern.matchAll(/\\([pP])\{([^}]+)\}/g)];
  try {
    const ast = parse(`/${pattern}/${flags}`);
    const tree = describeRoot(ast);
    if (props.length > 0) {
      // regexp-tree (this version) doesn't model \p{...} / \P{...} and silently
      // reduces them to their literal characters. Explain them explicitly so the
      // breakdown isn't misleading.
      const seen = new Set<string>();
      const children: ExplainNode[] = [];
      for (const [full, pP, name] of props) {
        if (seen.has(full)) continue;
        seen.add(full);
        children.push({
          label: full,
          detail: `any code point that is ${pP === "P" ? "NOT " : ""}${describeProperty(name)}`,
        });
      }
      tree.children = [
        { label: "Unicode property escapes", detail: "matched by code-point property", children },
        ...(tree.children ?? []),
      ];
    }
    return { tree };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
