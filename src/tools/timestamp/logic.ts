/**
 * Unix epoch <-> date conversion helpers.
 * Pure functions — no DOM/React. Uses the standard `Date` global, which is
 * available in both the browser and Node.
 */

export interface TimestampParts {
  /** Whole seconds since the Unix epoch. */
  epochSeconds: number;
  /** Milliseconds since the Unix epoch. */
  epochMillis: number;
  /** ISO 8601 string in UTC, e.g. "2023-11-14T22:13:20.000Z". */
  iso: string;
  /** Human UTC string, e.g. "Tue, 14 Nov 2023 22:13:20 GMT". */
  utc: string;
  /** Local-time string for the host's timezone. */
  local: string;
  /** RFC 2822 style string with timezone offset. */
  rfc2822: string;
  /** Human relative string, e.g. "3 hours ago" / "in 5 minutes". */
  relative: string;
}

// A bare number with this many digits or more is treated as milliseconds.
// 1e12 ms ≈ year 2001; below that we assume the value is in seconds.
const MS_THRESHOLD = 1e12;

/**
 * Parse a string into a Date. Accepts:
 *  - a Unix epoch in seconds or milliseconds (auto-detected by magnitude), and
 *  - an ISO 8601 / RFC date string parseable by `Date`.
 * Throws on anything that does not resolve to a valid date.
 */
export function parseInput(str: string): Date {
  const trimmed = str.trim();
  if (trimmed === "") {
    throw new Error("Empty input.");
  }

  // Pure integer (optionally signed) => treat as an epoch value.
  if (/^[+-]?\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      throw new Error("Number is out of range.");
    }
    const millis = Math.abs(n) >= MS_THRESHOLD ? n : n * 1000;
    const date = new Date(millis);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Epoch value is out of the representable range.");
    }
    return date;
  }

  // Decimal epoch seconds (e.g. "1700000000.5").
  if (/^[+-]?\d+\.\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    const date = new Date(seconds * 1000);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Epoch value is out of the representable range.");
    }
    return date;
  }

  // Otherwise defer to Date's string parsing (ISO / RFC).
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Could not parse a date or epoch from the input.");
  }
  return parsed;
}

const RELATIVE_UNITS: Array<{ limit: number; div: number; unit: string }> = [
  { limit: 60_000, div: 1000, unit: "second" },
  { limit: 3_600_000, div: 60_000, unit: "minute" },
  { limit: 86_400_000, div: 3_600_000, unit: "hour" },
  { limit: 2_592_000_000, div: 86_400_000, unit: "day" },
  { limit: 31_536_000_000, div: 2_592_000_000, unit: "month" },
  { limit: Infinity, div: 31_536_000_000, unit: "year" },
];

/** Build a "x units ago" / "in x units" string relative to `now`. */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const diff = date.getTime() - now.getTime(); // future => positive
  const abs = Math.abs(diff);
  if (abs < 1000) return "just now";

  for (const { limit, div, unit } of RELATIVE_UNITS) {
    if (abs < limit) {
      const value = Math.round(abs / div);
      const plural = value === 1 ? unit : `${unit}s`;
      return diff < 0 ? `${value} ${plural} ago` : `in ${value} ${plural}`;
    }
  }
  return "just now";
}

/** Produce every representation of a Date. */
export function describe(date: Date, now: Date = new Date()): TimestampParts {
  const ms = date.getTime();
  if (Number.isNaN(ms)) {
    throw new Error("Invalid date.");
  }
  return {
    epochSeconds: Math.floor(ms / 1000),
    epochMillis: ms,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toString(),
    rfc2822: toRfc2822(date),
    relative: relativeTime(date, now),
  };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a Date as an RFC 2822 string in local time, e.g.
 * "Tue, 14 Nov 2023 14:13:20 -0800". */
function toRfc2822(date: Date): string {
  const day = DAYS[date.getDay()];
  const month = MONTHS[date.getMonth()];
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const offset = `${sign}${pad(Math.floor(absMin / 60))}${pad(absMin % 60)}`;
  return (
    `${day}, ${pad(date.getDate())} ${month} ${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${offset}`
  );
}
