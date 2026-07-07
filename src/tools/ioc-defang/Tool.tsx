import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Field, OutputArea } from "@/components/tool/parts";
import { defang, refang, extractIocs, type IocResult } from "./logic";

type Mode = "defang" | "refang" | "extract";

const SAMPLE =
  "Reported IOCs: beacon at hxxps://evil[.]example[.]com/gate[.]php, phishing sender bad[@]phish[.]net, C2 at 192[.]168[.]13[.]37, dropper MD5 44d88612fea8a8f36de82e1278abb02f. Also see hxxp://cdn[.]malicious[.]co/x.";

const GROUPS: { key: keyof IocResult; label: string }[] = [
  { key: "urls", label: "URLs" },
  { key: "ipv4", label: "IPv4" },
  { key: "ipv6", label: "IPv6" },
  { key: "domains", label: "Domains" },
  { key: "emails", label: "Emails" },
  { key: "hashes", label: "Hashes" },
];

export default function IocDefangTool() {
  const [mode, setMode] = useState<Mode>("refang");
  const [input, setInput] = useState("");

  const transformed = useMemo(() => {
    if (mode === "defang") return defang(input);
    if (mode === "refang") return refang(input);
    return "";
  }, [input, mode]);

  const iocs = useMemo(
    () => (mode === "extract" && input.trim() ? extractIocs(input) : null),
    [input, mode],
  );

  const iocTotal = iocs
    ? GROUPS.reduce((n, g) => n + iocs[g.key].length, 0)
    : 0;

  return (
    <>
      <Segmented<Mode>
        aria-label="Mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: "refang", label: "Refang" },
          { value: "defang", label: "Defang" },
          { value: "extract", label: "Extract" },
        ]}
      />

      <Field
        label={mode === "extract" ? "Text to scan" : mode === "defang" ? "Live text" : "Defanged text"}
        hint={
          mode === "defang"
            ? "Rewrite live indicators into an inert form (hxxp, [.], [@]) that's safe to paste into a report."
            : mode === "refang"
              ? "Reverse the common defang notations back to live, resolvable indicators."
              : "Refang, then pull out URLs, IPs, domains, emails and file hashes."
        }
        actions={
          <button
            onClick={() => setInput(SAMPLE)}
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
          placeholder="hxxps://evil[.]example[.]com  ·  bad[@]phish[.]net  ·  192[.]168[.]0[.]1"
          rows={5}
        />
      </Field>

      {mode !== "extract" ? (
        transformed ? (
          <OutputArea
            value={transformed}
            label={mode === "defang" ? "Defanged" : "Refanged"}
            filename={mode === "defang" ? "defanged.txt" : "refanged.txt"}
            mono
          />
        ) : null
      ) : iocs ? (
        iocTotal === 0 ? (
          <p className="text-sm text-muted-foreground">No IOCs found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {GROUPS.filter((g) => iocs[g.key].length > 0).map((g) => (
              <OutputArea
                key={g.key}
                value={iocs[g.key].join("\n")}
                label={`${g.label} (${iocs[g.key].length})`}
                filename={`${g.key}.txt`}
                mono
              />
            ))}
          </div>
        )
      ) : null}
    </>
  );
}
