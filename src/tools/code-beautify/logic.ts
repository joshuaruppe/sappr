/**
 * Format source code in-browser, offline. Most languages go through Prettier's
 * standalone build; SQL uses sql-formatter and XML uses our own small formatter
 * (see ./xml). Pure async functions — no DOM/React.
 *
 * Prettier plugins are loaded LAZILY (dynamic import) so each becomes its own
 * Vite chunk: opening the tool downloads only the plugin(s) for the language
 * actually used, not the whole ~2MB plugin set.
 */
import * as prettier from "prettier/standalone";
import type { Plugin } from "prettier";
import { format as formatSqlRaw } from "sql-formatter";
import { formatXml } from "./xml";

export type Language =
  | "json"
  | "yaml"
  | "xml"
  | "sql"
  | "html"
  | "css"
  | "scss"
  | "less"
  | "javascript"
  | "typescript"
  | "graphql"
  | "markdown";

export interface BeautifyOptions {
  /** Spaces (or tab columns) per indent level. */
  tabWidth?: number;
}

type Engine = "prettier" | "sql" | "xml";

/** Lazy loaders for Prettier plugins — one dynamic import (chunk) each. */
const PLUGIN_LOADERS = {
  babel: () => import("prettier/plugins/babel"),
  estree: () => import("prettier/plugins/estree"),
  typescript: () => import("prettier/plugins/typescript"),
  html: () => import("prettier/plugins/html"),
  postcss: () => import("prettier/plugins/postcss"),
  markdown: () => import("prettier/plugins/markdown"),
  yaml: () => import("prettier/plugins/yaml"),
  graphql: () => import("prettier/plugins/graphql"),
} as const;

type PluginName = keyof typeof PLUGIN_LOADERS;

interface LanguageConfig {
  /** Human label for the picker. */
  label: string;
  /** Which formatter backs this language. */
  engine: Engine;
  /** Prettier parser name (prettier engine only). */
  parser?: string;
  /** Prettier plugins required for that parser (prettier engine only). */
  plugins?: PluginName[];
}

/** Maps each supported language to its formatter config. */
export const LANGUAGES: Record<Language, LanguageConfig> = {
  json: { label: "JSON", engine: "prettier", parser: "json", plugins: ["babel", "estree"] },
  yaml: { label: "YAML", engine: "prettier", parser: "yaml", plugins: ["yaml"] },
  xml: { label: "XML", engine: "xml" },
  sql: { label: "SQL", engine: "sql" },
  html: { label: "HTML", engine: "prettier", parser: "html", plugins: ["html"] },
  css: { label: "CSS", engine: "prettier", parser: "css", plugins: ["postcss"] },
  scss: { label: "SCSS", engine: "prettier", parser: "scss", plugins: ["postcss"] },
  less: { label: "LESS", engine: "prettier", parser: "less", plugins: ["postcss"] },
  javascript: { label: "JavaScript", engine: "prettier", parser: "babel", plugins: ["babel", "estree"] },
  typescript: { label: "TypeScript", engine: "prettier", parser: "typescript", plugins: ["typescript", "estree"] },
  graphql: { label: "GraphQL", engine: "prettier", parser: "graphql", plugins: ["graphql"] },
  markdown: { label: "Markdown", engine: "prettier", parser: "markdown", plugins: ["markdown"] },
};

/** Languages grouped for the picker. */
export const LANGUAGE_GROUPS: { label: string; languages: Language[] }[] = [
  { label: "Data", languages: ["json", "yaml", "xml", "sql"] },
  { label: "Web", languages: ["html", "css", "scss", "less"] },
  { label: "Code", languages: ["javascript", "typescript", "graphql"] },
  { label: "Docs", languages: ["markdown"] },
];

/** Flat, ordered list of languages (derived from the groups). */
export const LANGUAGE_ORDER: Language[] = LANGUAGE_GROUPS.flatMap(
  (g) => g.languages,
);

const pluginCache = new Map<PluginName, Promise<Plugin>>();

async function loadPlugin(name: PluginName): Promise<Plugin> {
  let pending = pluginCache.get(name);
  if (!pending) {
    pending = PLUGIN_LOADERS[name]().then(
      (mod) => ((mod as { default?: Plugin }).default ?? mod) as Plugin,
    );
    pluginCache.set(name, pending);
  }
  return pending;
}

function formatSql(code: string, tabWidth: number): string {
  return formatSqlRaw(code, { language: "sql", keywordCase: "upper", tabWidth });
}

/**
 * Format `code` for the given `language`. Resolves to the formatted source;
 * rejects with the formatter's error (e.g. a parse/syntax error) on failure.
 * XML is re-indented best-effort and never rejects.
 */
export async function beautify(
  code: string,
  language: Language,
  opts: BeautifyOptions = {},
): Promise<string> {
  if (!code.trim()) return "";
  const cfg = LANGUAGES[language];
  if (!cfg) {
    throw new Error(`Unsupported language: ${language}`);
  }
  const tabWidth = opts.tabWidth ?? 2;

  switch (cfg.engine) {
    case "sql":
      return formatSql(code, tabWidth);
    case "xml":
      return formatXml(code, { tabWidth });
    default: {
      const plugins = await Promise.all((cfg.plugins ?? []).map(loadPlugin));
      return prettier.format(code, { parser: cfg.parser!, plugins, tabWidth });
    }
  }
}
