/**
 * Pretty-print SQL via sql-formatter.
 * Pure functions — no DOM/React; safe to call from a test or a worker.
 */
import { format } from "sql-formatter";

export type SqlDialect =
  | "sql"
  | "postgresql"
  | "mysql"
  | "sqlite"
  | "transactsql"
  | "bigquery"
  | "mariadb";

export type KeywordCase = "upper" | "lower" | "preserve";

export interface FormatSqlOptions {
  dialect?: SqlDialect;
  keywordCase?: KeywordCase;
  tabWidth?: number;
}

export function formatSql(sql: string, opts: FormatSqlOptions = {}): string {
  if (!sql.trim()) return "";
  try {
    return format(sql, {
      language: opts.dialect ?? "sql",
      keywordCase: opts.keywordCase ?? "upper",
      tabWidth: opts.tabWidth ?? 2,
    });
  } catch (e) {
    throw new Error(
      e instanceof Error ? e.message : "Could not format SQL (malformed input).",
    );
  }
}
