import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Badge } from "@/components/ui/badge";
import { Field, ErrorNote } from "@/components/tool/parts";
import { FindingsSection } from "@/components/tool/findings";
import { cn } from "@/lib/utils";
import { parseListing, type ParsedMode, type PermClass, type Severity, type Finding } from "./logic";

type ListView = "concerning" | "all";

const SAMPLE_LISTING = `total 16164
    4 drwxr-xr-x  18 root root     4096 Jul 16  2025 .
    0 lrwxrwxrwx   1 root root        7 Jul 16  2025 bin -> usr/bin
16132 -rw-r--r--   1 root root 16517243 Oct 20  2024 ffmpeg.tar.gz
    4 drwxr-xr-x   5 root root     4096 Jun 23 17:37 home
   16 drwx------   2 root root    16384 Jul 16  2025 lost+found
 3812 -rwsr-xr-x   1 root root  3822800 Mar 23  2024 sudo
    4 drwxrwxrwt  12 root root     4096 Jul  3 06:51 tmp
    4 -rw-rw-rw-   1 root root      220 Jul  3 06:51 world.conf`;

const SEV_CLASS: Record<Severity, string> = {
  high: "bg-destructive/15 text-destructive border-transparent",
  medium: "bg-warning/15 text-warning border-transparent",
  info: "bg-muted text-muted-foreground border-transparent",
};

function topSeverity(concerns: Finding[]): Severity | null {
  if (concerns.some((c) => c.severity === "high")) return "high";
  if (concerns.some((c) => c.severity === "medium")) return "medium";
  return concerns.length ? "info" : null;
}

function describeClass(c: PermClass): string {
  const parts = [c.read && "read", c.write && "write", c.execute && "execute"].filter(Boolean);
  return parts.length ? parts.join(", ") : "none";
}

const SHORT_TYPE: Record<string, string> = {
  "-": "file",
  d: "dir",
  l: "link",
  b: "block",
  c: "char",
  p: "fifo",
  s: "sock",
};

/** A single r/w/x permission tag; dim when the bit is unset. */
function PermTag({ ch, active, tone }: { ch: string; active: boolean; tone?: "warn" | "special" }) {
  return (
    <span
      className={cn(
        "inline-block w-4 rounded text-center font-mono text-[0.72rem] leading-5",
        active
          ? tone === "special"
            ? "bg-warning/20 text-warning"
            : tone === "warn"
              ? "bg-warning/15 text-warning"
              : "bg-muted text-foreground"
          : "text-muted-foreground/25",
      )}
    >
      {ch}
    </span>
  );
}

/** One permission class (owner/group/other) as r/w/x tags. Group/other write is
 * amber (the tamperability signal); a full rwx class is flagged. Special bits
 * render in the execute slot (s/S/t/T). */
function ClassCell({
  cls,
  klass,
  special,
}: {
  cls: PermClass;
  klass: "owner" | "group" | "other";
  special: "suid" | "sgid" | "sticky" | null;
}) {
  const xChar =
    special === "suid" || special === "sgid"
      ? cls.execute
        ? "s"
        : "S"
      : special === "sticky"
        ? cls.execute
          ? "t"
          : "T"
        : cls.execute
          ? "x"
          : "-";
  const writeWarn = klass !== "owner";
  const flagFull = klass !== "owner" && cls.read && cls.write && cls.execute;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-0.5",
        flagFull && "bg-warning/10 ring-1 ring-warning/40",
      )}
    >
      <PermTag ch={cls.read ? "r" : "-"} active={cls.read} />
      <PermTag ch={cls.write ? "w" : "-"} active={cls.write} tone={writeWarn ? "warn" : undefined} />
      <PermTag ch={xChar} active={cls.execute || special !== null} tone={special ? "special" : undefined} />
    </div>
  );
}

/** The octal value with a glassy hover-card explaining what each class grants.
 * A pointer-events-none portal tooltip — the mouse can never enter it, so it
 * can't get stuck open; it closes cleanly on mouseleave/blur. */
function OctalHover({ mode, typeChar }: { mode: ParsedMode; typeChar: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ top: number; left: number; above: boolean } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const above = r.top > 220; // enough room above? otherwise drop below
    setBox({
      top: above ? r.top - 6 : r.bottom + 6,
      // clamp so a 15rem (240px) card stays on-screen
      left: Math.max(8, Math.min(r.left, window.innerWidth - 248)),
      above,
    });
  };
  const hide = () => setBox(null);

  const rows: { klass: "owner" | "group" | "other"; cls: PermClass }[] = [
    { klass: "owner", cls: mode.owner },
    { klass: "group", cls: mode.group },
    { klass: "other", cls: mode.other },
  ];
  const special = [
    mode.setuid && "setuid",
    mode.setgid && "setgid",
    mode.sticky && "sticky",
  ].filter(Boolean) as string[];

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="cursor-help rounded font-mono text-muted-foreground underline decoration-dotted decoration-muted-foreground/40 underline-offset-2 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {mode.octal}
      </span>
      {box
        ? createPortal(
            <div
              style={{
                position: "fixed",
                top: box.top,
                left: box.left,
                transform: box.above ? "translateY(-100%)" : undefined,
              }}
              className="animate-fade pointer-events-none z-50 w-60 overflow-hidden rounded-xl border border-border/60 bg-popover/70 shadow-2xl ring-1 ring-inset ring-white/10 backdrop-blur-xl"
            >
              <div className="h-px w-full bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
              <div className="flex flex-col gap-2.5 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text font-mono text-lg font-semibold tracking-tight text-transparent">
                    {mode.octal}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {typeChar}
                    {mode.symbolic}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {rows.map((r) => (
                    <div key={r.klass} className="flex items-baseline justify-between gap-6">
                      <span className="text-xs capitalize text-muted-foreground">{r.klass}</span>
                      <span className="text-xs text-foreground">{describeClass(r.cls)}</span>
                    </div>
                  ))}
                </div>
                {special.length ? (
                  <div className="flex flex-wrap items-center gap-1 border-t border-border/40 pt-2">
                    {special.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-warning/15 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-warning"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default function FilePermsTool() {
  const [input, setInput] = useState("");
  const [view, setView] = useState<ListView>("concerning");

  const listing = useMemo(() => parseListing(input), [input]);

  return (
    <>
      <Field
        label="ls -l output"
        hint="Paste `ls -l`, `ls -la` or `ls -ls`. Leading block-size columns, symlinks and the `total` header are handled. Hover any octal for a full breakdown."
        actions={
          <button
            onClick={() => setInput(SAMPLE_LISTING)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Load sample
          </button>
        }
      >
        <Textarea
          autoFocus
          mono
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"drwxr-xr-x 2 root root 4096 Jul 16 2025 etc\n-rwsr-xr-x 1 root root 68208 Mar 23 2024 sudo"}
          rows={8}
        />
      </Field>

      {input.trim() && listing.error ? <ErrorNote>{listing.error}</ErrorNote> : null}

      {listing.entries.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Segmented<ListView>
              aria-label="View"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "concerning", label: "Concerning only" },
                { value: "all", label: "Explain all" },
              ]}
            />
            <span className="text-xs text-muted-foreground">{listing.entries.length} entries</span>
          </div>

          <FindingsSection
            findings={listing.findings}
            emptyLabel={`Nothing concerning across ${listing.entries.length} entries.`}
          />

          {view === "all" ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th rowSpan={2} className="px-2.5 py-1.5 align-bottom font-medium">
                      Name
                    </th>
                    <th rowSpan={2} className="px-2.5 py-1.5 align-bottom font-medium">
                      Type
                    </th>
                    <th
                      colSpan={4}
                      className="border-b border-border/40 px-2.5 pb-0.5 pt-1.5 text-center font-medium"
                    >
                      Permissions
                    </th>
                    <th rowSpan={2} className="px-2.5 py-1.5 align-bottom font-medium">
                      Flag
                    </th>
                  </tr>
                  <tr>
                    <th className="px-2.5 py-1 font-medium">Octal</th>
                    <th className="px-2.5 py-1 font-medium">Owner</th>
                    <th className="px-2.5 py-1 font-medium">Group</th>
                    <th className="px-2.5 py-1 font-medium">Other</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.entries.map((e, i) => {
                    const sev = topSeverity(e.concerns);
                    return (
                      <tr key={i} className="border-t border-border/60">
                        <td className="px-2.5 py-1.5">
                          <div className="font-mono text-foreground">
                            {e.name}
                            {e.target ? (
                              <span className="text-muted-foreground"> → {e.target}</span>
                            ) : null}
                          </div>
                          <div className="font-mono text-[0.7rem] text-muted-foreground/60">
                            {e.owner}:{e.group}
                          </div>
                        </td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">
                          {SHORT_TYPE[e.type] ?? "file"}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <OctalHover mode={e.mode} typeChar={e.type} />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <ClassCell
                            cls={e.mode.owner}
                            klass="owner"
                            special={e.mode.setuid ? "suid" : null}
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <ClassCell
                            cls={e.mode.group}
                            klass="group"
                            special={e.mode.setgid ? "sgid" : null}
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <ClassCell
                            cls={e.mode.other}
                            klass="other"
                            special={e.mode.sticky ? "sticky" : null}
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          {sev ? (
                            <Badge className={SEV_CLASS[sev]}>
                              {sev === "high" ? "High" : sev === "medium" ? "Med" : "Info"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/40">·</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
