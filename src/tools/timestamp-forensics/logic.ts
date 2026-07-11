/**
 * Decode a "mystery" numeric timestamp across the epoch formats DFIR analysts
 * hit - Unix (s/ms/µs/ns), Windows FILETIME, Chrome/WebKit, Mac Absolute/Cocoa,
 * APFS, HFS+, NTP, OLE Automation date and packed DOS date/time - and show every
 * plausible interpretation, flagging the ones that land in a realistic range.
 * Complements the Unix-focused Timestamp tool and the Windows FILETIME tool.
 * Pure math, no DOM.
 */

const FILETIME_EPOCH_MS = 11644473600000n; // 1601-01-01 → 1970-01-01, in ms
const MAC_2001_S = 978307200; // 2001-01-01 in Unix seconds
const HFS_1904_S = 2082844800; // 1904-01-01 → 1970 offset, seconds
const NTP_1900_S = 2208988800; // 1900-01-01 → 1970 offset, seconds
const OLE_EPOCH_DAYS = 25569; // 1970-01-01 as an OLE (1899-12-30) day number

export interface TsInterpretation {
  format: string;
  utc: string;
  /** True when the result lands in a realistic modern range (2000-2040). */
  likely: boolean;
}

export interface TsResult {
  interpretations: TsInterpretation[];
  error: string;
}

function fromMs(ms: number): { utc: string; year: number } | null {
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  if (year < 1950 || year > 2200) return null; // outside a believable window
  return { utc: d.toISOString(), year };
}

function decodeDos(v: number): string | null {
  const date = (v >>> 16) & 0xffff;
  const time = v & 0xffff;
  const year = ((date >>> 9) & 0x7f) + 1980;
  const month = (date >>> 5) & 0xf;
  const day = date & 0x1f;
  const hour = (time >>> 11) & 0x1f;
  const min = (time >>> 5) & 0x3f;
  const sec = (time & 0x1f) * 2;
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || min > 59 || sec > 59) {
    return null;
  }
  const d = new Date(Date.UTC(year, month - 1, day, hour, min, sec));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function decodeTimestamp(input: string): TsResult {
  const t = input.trim().replace(/[,_\s]/g, "");
  if (t === "") return { interpretations: [], error: "" };

  let dec: string;
  if (/^0x[0-9a-fA-F]+$/.test(t)) dec = BigInt(t).toString();
  else if (/^-?\d+(\.\d+)?$/.test(t)) dec = t;
  else return { interpretations: [], error: "Enter a numeric timestamp (decimal or 0x-hex)." };

  const num = Number(dec);
  const isInt = /^-?\d+$/.test(dec);
  const big = isInt ? BigInt(dec) : null;

  const out: TsInterpretation[] = [];
  const add = (format: string, ms: number) => {
    const f = fromMs(ms);
    if (f) out.push({ format, utc: f.utc, likely: f.year >= 2000 && f.year <= 2040 });
  };

  add("Unix seconds", num * 1000);
  add("Unix milliseconds", num);
  add("Unix microseconds", num / 1000);
  add("Unix nanoseconds / APFS", num / 1e6);
  if (big !== null) {
    add("Windows FILETIME (100 ns since 1601)", Number(big / 10000n - FILETIME_EPOCH_MS));
    add("Chrome / WebKit (µs since 1601)", Number(big / 1000n - FILETIME_EPOCH_MS));
  }
  add("Mac Absolute / Cocoa (s since 2001)", (num + MAC_2001_S) * 1000);
  add("HFS+ (s since 1904)", (num - HFS_1904_S) * 1000);
  add("NTP (s since 1900)", (num - NTP_1900_S) * 1000);
  add("OLE Automation date (days since 1899)", (num - OLE_EPOCH_DAYS) * 86400000);

  if (isInt && num >= 0 && num <= 0xffffffff) {
    const dos = decodeDos(num);
    if (dos) {
      const year = new Date(dos).getUTCFullYear();
      out.push({ format: "DOS date/time (packed)", utc: dos, likely: year >= 2000 && year <= 2040 });
    }
  }

  // Likely interpretations first, otherwise keep insertion order.
  const sorted = [...out].sort((a, b) => Number(b.likely) - Number(a.likely));
  return { interpretations: sorted, error: "" };
}
