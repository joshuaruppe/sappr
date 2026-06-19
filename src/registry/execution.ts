import type { ToolExecution } from "./types";

/**
 * Single source of truth for the execution taxonomy: the label, description and
 * dot color used for a tool's "where does this run" indicator. Drives the menu
 * dots, the tool header, and the legend on the home page.
 */
export interface ExecutionInfo {
  id: ToolExecution;
  /** Full label, e.g. "In your browser". */
  label: string;
  /** Short label for tight spaces. */
  short: string;
  description: string;
  /** Tailwind background utility for the colored dot. */
  dotClass: string;
  /** Tailwind text utility matching the dot. */
  textClass: string;
  order: number;
}

export const EXECUTION_INFO: Record<ToolExecution, ExecutionInfo> = {
  client: {
    id: "client",
    label: "In your browser",
    short: "Browser",
    description: "Runs entirely client-side. Nothing you enter ever leaves this machine.",
    dotClass: "bg-success",
    textClass: "text-success",
    order: 1,
  },
  server: {
    id: "server",
    label: "On the server",
    short: "Server",
    description: "Runs on the sappr server you self-host. Input stays inside your instance.",
    dotClass: "bg-info",
    textClass: "text-info",
    order: 2,
  },
  external: {
    id: "external",
    label: "External API",
    short: "External",
    description: "Calls a third-party service, so your input leaves the app entirely.",
    dotClass: "bg-warning",
    textClass: "text-warning",
    order: 3,
  },
  mixed: {
    id: "mixed",
    label: "Hybrid",
    short: "Hybrid",
    description: "Partly in your browser, partly on the server.",
    dotClass: "bg-primary",
    textClass: "text-primary",
    order: 4,
  },
};

/** Resolve execution info, defaulting to client. */
export function executionOf(execution: ToolExecution | undefined): ExecutionInfo {
  return EXECUTION_INFO[execution ?? "client"];
}

/** The execution types surfaced in the home-page legend, in order. */
export const LEGEND_EXECUTIONS: ExecutionInfo[] = [
  EXECUTION_INFO.client,
  EXECUTION_INFO.server,
  EXECUTION_INFO.external,
];
