import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import { generateRedirector, parseProfile, parseUriList } from "./logic";

type Mode = "profile" | "manual";

const SAMPLE_PROFILE = `http-get {
    set uri "/api/v1/updates /jquery-3.3.1.min.js";
    client { header "Host" "cdn.example.com"; }
}
http-post {
    set uri "/submit.php";
}
set useragent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0";`;

export default function RedirectorTool() {
  const [mode, setMode] = useState<Mode>("profile");
  const [profile, setProfile] = useState("");
  const [uriText, setUriText] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [teamServer, setTeamServer] = useState("");
  const [decoy, setDecoy] = useState("");
  const [blockScanners, setBlockScanners] = useState(true);

  const parsed = useMemo(
    () =>
      mode === "profile"
        ? parseProfile(profile)
        : { uris: parseUriList(uriText), userAgent: userAgent.trim() },
    [mode, profile, uriText, userAgent],
  );

  const hasInput = mode === "profile" ? profile.trim() !== "" : uriText.trim() !== "";

  const result = useMemo(
    () =>
      hasInput
        ? generateRedirector({
            uris: parsed.uris,
            userAgent: parsed.userAgent,
            teamServer,
            decoy,
            blockScanners,
          })
        : null,
    [hasInput, parsed, teamServer, decoy, blockScanners],
  );

  function loadSample() {
    setMode("profile");
    setProfile(SAMPLE_PROFILE);
    setTeamServer("https://10.10.5.20:8443");
    setDecoy("https://www.microsoft.com");
    setBlockScanners(true);
  }

  return (
    <>
      <Segmented<Mode>
        aria-label="Input mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: "profile", label: "From C2 profile" },
          { value: "manual", label: "Manual" },
        ]}
      />

      {mode === "profile" ? (
        <Field
          label="Cobalt Strike malleable profile"
          hint="Paste a profile; the URIs and User-Agent are parsed out. It stays in your browser."
          actions={
            <button
              onClick={loadSample}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Load sample
            </button>
          }
        >
          <Textarea
            autoFocus
            mono
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder={'http-get { set uri "/path"; }  set useragent "...";'}
            rows={8}
          />
        </Field>
      ) : (
        <>
          <Field
            label="Beacon URIs"
            hint="One per line (or space/comma separated). A leading slash is added if missing."
          >
            <Textarea
              autoFocus
              mono
              value={uriText}
              onChange={(e) => setUriText(e.target.value)}
              placeholder={"/api/v1/updates\n/submit.php"}
              rows={4}
            />
          </Field>
          <Field
            label="User-Agent"
            hint="Exact UA the beacon sends. Leave blank to match on URI only (weaker)."
          >
            <Input
              value={userAgent}
              onChange={(e) => setUserAgent(e.target.value)}
              placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
              className="font-mono"
              spellCheck={false}
            />
          </Field>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Team server" hint="Full URL that valid traffic is proxied to.">
          <Input
            value={teamServer}
            onChange={(e) => setTeamServer(e.target.value)}
            placeholder="https://10.10.5.20:8443"
            className="font-mono"
            spellCheck={false}
          />
        </Field>
        <Field label="Decoy URL" hint="Where non-matching traffic is redirected.">
          <Input
            value={decoy}
            onChange={(e) => setDecoy(e.target.value)}
            placeholder="https://www.microsoft.com"
            className="font-mono"
            spellCheck={false}
          />
        </Field>
      </div>

      <Switch
        checked={blockScanners}
        onChange={setBlockScanners}
        label="Also sink common scanner / sandbox User-Agents to the decoy"
      />

      {mode === "profile" && profile.trim() ? (
        <p className="text-xs text-muted-foreground">
          Parsed <span className="font-medium text-foreground">{parsed.uris.length}</span> URI
          {parsed.uris.length === 1 ? "" : "s"}
          {parsed.userAgent ? " and a User-Agent" : "; no User-Agent found"}.
        </p>
      ) : null}

      {result?.error ? <ErrorNote>{result.error}</ErrorNote> : null}

      {result && !result.error ? (
        <>
          {result.warnings.length > 0 ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <ul className="list-disc space-y-1 pl-4 text-sm">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <OutputArea value={result.nginx} label="nginx" filename="redirector.nginx.conf" mono />
          <OutputArea
            value={result.apache}
            label="Apache (mod_rewrite)"
            filename="redirector.htaccess"
            mono
          />
        </>
      ) : null}
    </>
  );
}
