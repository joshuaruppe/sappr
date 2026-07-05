/**
 * Parse a crontab and explain each schedule in English, plus flag persistence
 * and privilege-escalation red flags: @reboot jobs, world-writable script
 * paths, PATH hijacks and remote-download-piped-to-shell. Pure — no DOM.
 *
 * Handles user crontabs (5 fields + command) and system crontabs / cron.d
 * (5 fields + user + command), plus the @macros.
 */

export type Severity = "high" | "medium" | "info";

export interface Finding {
  severity: Severity;
  message: string;
}

export interface CronJob {
  raw: string;
  schedule: string;
  description: string;
  user?: string;
  command: string;
  valid: boolean;
}

export interface CronEnv {
  name: string;
  value: string;
}

export interface CrontabResult {
  jobs: CronJob[];
  env: CronEnv[];
  findings: Finding[];
  error: string;
}

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const MONTH_NAMES: Record<string, string> = {
  jan: "1", feb: "2", mar: "3", apr: "4", may: "5", jun: "6",
  jul: "7", aug: "8", sep: "9", oct: "10", nov: "11", dec: "12",
};
const DOW_NAMES: Record<string, string> = {
  sun: "0", mon: "1", tue: "2", wed: "3", thu: "4", fri: "5", sat: "6",
};

const MACROS: Record<string, { fields: string; text: string }> = {
  "@reboot": { fields: "", text: "at system boot" },
  "@yearly": { fields: "0 0 1 1 *", text: "at 00:00 on 1 January" },
  "@annually": { fields: "0 0 1 1 *", text: "at 00:00 on 1 January" },
  "@monthly": { fields: "0 0 1 * *", text: "at 00:00 on day 1 of the month" },
  "@weekly": { fields: "0 0 * * 0", text: "at 00:00 on Sunday" },
  "@daily": { fields: "0 0 * * *", text: "every day at 00:00" },
  "@midnight": { fields: "0 0 * * *", text: "every day at 00:00" },
  "@hourly": { fields: "0 * * * *", text: "at minute 0 of every hour" },
};

const SEV_RANK: Record<Severity, number> = { high: 0, medium: 1, info: 2 };

const pad = (n: number) => String(n).padStart(2, "0");

function normalizeNames(expr: string, map: Record<string, string>): string {
  return expr.replace(/[a-z]{3}/gi, (m) => map[m.toLowerCase()] ?? m);
}

function validBase(tok: string, min: number, max: number): boolean {
  const r = tok.match(/^(\d+)-(\d+)$/);
  if (r) {
    const a = +r[1];
    const b = +r[2];
    return a >= min && b <= max && a <= b;
  }
  if (/^\d+$/.test(tok)) {
    const n = +tok;
    return n >= min && n <= max;
  }
  return false;
}

function validField(expr: string, min: number, max: number): boolean {
  return expr.split(",").every((tok) => {
    if (tok === "*") return true;
    const step = tok.match(/^(\*|\d+|\d+-\d+)\/(\d+)$/);
    if (step) {
      if (+step[2] < 1) return false;
      return step[1] === "*" || validBase(step[1], min, max);
    }
    return validBase(tok, min, max);
  });
}

function nm(tok: string, nameFn?: (n: number) => string): string {
  if (nameFn && /^\d+$/.test(tok)) return nameFn(+tok);
  return tok;
}

function describeTok(tok: string, nameFn?: (n: number) => string): string {
  if (tok === "*") return "every";
  const step = tok.match(/^(\*|\d+|\d+-\d+)\/(\d+)$/);
  if (step) {
    const within = step[1] === "*" ? "" : ` within ${step[1]}`;
    return `every ${step[2]}${within}`;
  }
  const range = tok.match(/^(\d+)-(\d+)$/);
  if (range) return `${nm(range[1], nameFn)}–${nm(range[2], nameFn)}`;
  return nm(tok, nameFn);
}

function describeField(expr: string, nameFn?: (n: number) => string): string {
  return expr
    .split(",")
    .map((t) => describeTok(t, nameFn))
    .join(", ");
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** A readable phrase for a minute/hour field: "every hour", "every 5 minutes",
 * or "minute 0, 30" / "hour 9–17". */
function fieldPhrase(expr: string, unit: string): string {
  if (expr === "*") return `every ${unit}`;
  const step = expr.match(/^\*\/(\d+)$/);
  if (step) return `every ${step[1]} ${unit}s`;
  return `${unit} ${describeField(expr)}`;
}

function describeTime(min: string, hour: string): string {
  const mn = /^\d+$/.test(min) ? +min : null;
  const hr = /^\d+$/.test(hour) ? +hour : null;
  if (mn !== null && hr !== null) return `at ${pad(hr)}:${pad(mn)}`;
  if (min === "*" && hour === "*") return "every minute";
  const ms = min.match(/^\*\/(\d+)$/);
  if (ms && hour === "*") return `every ${ms[1]} minutes`;
  if (mn !== null && hour === "*") return `at minute ${mn} of every hour`;
  const hs = hour.match(/^\*\/(\d+)$/);
  if (mn !== null && hs) return `at minute ${mn} past every ${ordinal(+hs[1])} hour`;
  return `at ${fieldPhrase(min, "minute")} of ${fieldPhrase(hour, "hour")}`;
}

/** Human-readable description of a 5-field cron expression or a @macro. */
export function describeSchedule(schedule: string): { description: string; valid: boolean } {
  if (schedule.startsWith("@")) {
    const macro = MACROS[schedule.toLowerCase()];
    return macro
      ? { description: macro.text, valid: true }
      : { description: "unrecognized macro", valid: false };
  }

  const fields = schedule.split(/\s+/);
  if (fields.length !== 5) return { description: "not a 5-field schedule", valid: false };
  let [min, hour, dom, mon, dow] = fields;
  mon = normalizeNames(mon, MONTH_NAMES);
  dow = normalizeNames(dow, DOW_NAMES);

  const valid =
    validField(min, 0, 59) &&
    validField(hour, 0, 23) &&
    validField(dom, 1, 31) &&
    validField(mon, 1, 12) &&
    validField(dow, 0, 7);
  if (!valid) return { description: "invalid schedule (field out of range)", valid: false };

  const parts = [describeTime(min, hour)];
  if (dom !== "*") parts.push(`on day-of-month ${describeField(dom)}`);
  if (mon !== "*") parts.push(`in ${describeField(mon, (n) => MONTHS[n] ?? String(n))}`);
  if (dow !== "*") parts.push(`on ${describeField(dow, (n) => DAYS[n] ?? String(n))}`);

  let description = parts.join(", ");
  if (dom !== "*" && dow !== "*") {
    description += " (day-of-month OR day-of-week — cron runs when either matches)";
  }
  return { description: description.charAt(0).toUpperCase() + description.slice(1), valid: true };
}

const WRITABLE_DIRS = ["/tmp/", "/var/tmp/", "/dev/shm/"];

function commandFindings(command: string, user: string | undefined, findings: Finding[]): void {
  const firstTok = command.trim().split(/\s+/)[0] ?? "";

  if (WRITABLE_DIRS.some((d) => command.includes(d))) {
    findings.push({
      severity: "high",
      message: `Runs a script from a world-writable path: ${command}`,
    });
  }
  if (/\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|da|z)?sh\b/.test(command)) {
    findings.push({
      severity: "high",
      message: `Downloads and pipes to a shell: ${command}`,
    });
  }
  if (firstTok && !firstTok.startsWith("/") && !firstTok.includes("=")) {
    findings.push({
      severity: "medium",
      message: `Relative command "${firstTok}" is resolved via PATH — hijackable if an earlier PATH dir is writable.`,
    });
  }
  if (user === "root" && /\/home\//.test(command)) {
    findings.push({
      severity: "high",
      message: `root cron runs a script under /home (user-writable): ${command}`,
    });
  }
}

/** Parse a crontab. `system` = true for /etc/crontab and cron.d (a user column). */
export function parseCrontab(input: string, system: boolean): CrontabResult {
  const empty: CrontabResult = { jobs: [], env: [], findings: [], error: "" };
  const text = input.trim();
  if (text === "") return empty;

  const jobs: CronJob[] = [];
  const env: CronEnv[] = [];
  const findings: Finding[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;

    // Environment assignment: NAME = value.
    const envMatch = line.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/);
    if (envMatch) {
      const name = envMatch[1];
      const value = envMatch[2].replace(/^["']|["']$/g, "");
      env.push({ name, value });
      if (name === "PATH") {
        const entries = value.split(":");
        if (entries.some((e) => e === "" || e === "." || !e.startsWith("/"))) {
          findings.push({
            severity: "high",
            message: `cron PATH contains a relative or empty entry (${value}) — a writable early entry hijacks every job.`,
          });
        }
      }
      continue;
    }

    const tokens = line.split(/\s+/);
    let schedule: string;
    let idx: number;

    if (tokens[0].startsWith("@")) {
      schedule = tokens[0];
      idx = 1;
    } else {
      // A real cron line starts with a digit or "*". Anything else isn't cron.
      if (!/^[\d*]/.test(tokens[0])) continue;
      if (tokens.length < (system ? 7 : 6)) {
        jobs.push({ raw: line, schedule: line, description: "incomplete cron line", command: "", valid: false });
        continue;
      }
      schedule = tokens.slice(0, 5).join(" ");
      idx = 5;
    }

    let user: string | undefined;
    if (system) {
      user = tokens[idx];
      idx += 1;
    }
    const command = tokens.slice(idx).join(" ");

    const { description, valid } = describeSchedule(schedule);
    jobs.push({ raw: line, schedule, description, user, command, valid });

    if (schedule.toLowerCase() === "@reboot") {
      findings.push({
        severity: "info",
        message: `Runs at boot (${command || "no command"}) — common persistence mechanism.`,
      });
    }
    if (command) commandFindings(command, user, findings);
  }

  if (jobs.length === 0 && env.length === 0) {
    return {
      ...empty,
      error: "No cron jobs found. Paste crontab lines (e.g. `*/5 * * * * /path/to/job`).",
    };
  }

  findings.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  return { jobs, env, findings, error: "" };
}
