import type { LucideIcon } from "lucide-react";

/**
 * Where a tool's work physically happens:
 * - `client`   — entirely in the browser; nothing leaves the machine
 * - `server`   — on the self-hosted sappr server; stays within your instance
 * - `external` — calls a third-party API; input leaves the app entirely
 * - `mixed`    — hybrid (partly browser, partly server)
 */
export type ToolExecution = "client" | "server" | "external" | "mixed";

/** Maturity of a tool, surfaced as a small badge. */
export type ToolStatus = "stable" | "beta" | "wip";

/** Stable category identifiers. Display info lives in `categories.ts`. */
export type CategoryId =
  | "encoding"
  | "crypto"
  | "formatting"
  | "regex"
  | "convert"
  | "generate"
  | "network"
  | "forensics";

/**
 * Metadata for a single tool. Lives in each tool's `meta.ts` and is loaded
 * eagerly (it is tiny) to drive the nav, command palette, search and the
 * "all tools" launcher. The heavy component lives in a sibling `Tool.tsx`
 * that is code-split and lazy-loaded only when the tool is opened.
 */
export interface ToolMeta {
  /** Unique, URL-safe id. MUST match the tool's folder name. */
  id: string;
  /** Short human title, e.g. "Base64". */
  title: string;
  /** One-line description for cards, search and tooltips. */
  description: string;
  category: CategoryId;
  icon: LucideIcon;
  /** Extra search terms (synonyms, abbreviations, related ops). */
  keywords?: string[];
  /** Defaults to "client". */
  execution?: ToolExecution;
  /** Defaults to "stable". */
  status?: ToolStatus;
}
