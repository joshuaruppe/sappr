import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Field, OutputArea, ErrorNote } from "@/components/tool/parts";
import {
  beautify,
  LANGUAGES,
  LANGUAGE_GROUPS,
  type Language,
} from "./logic";

type TabWidth = "2" | "4";

const PLACEHOLDERS: Record<Language, string> = {
  json: '{"name":"sappr","nested":{"a":1,"b":[1,2,3]}}',
  yaml: "name:   sappr\nlist:\n-  a\n-   b",
  xml: '<root><item id="1"><name>sappr</name></item></root>',
  sql: "select id,name from users where active=1 order by name",
  html: "<div><p>hello</p><span>world</span></div>",
  css: "a{color:red;font-weight:bold}",
  scss: ".a{.b{color:red}}",
  less: ".a{.b{color:red}}",
  javascript: "const greet=(name)=>{return `hi ${name}`}",
  typescript: "type X={a:number};const f=(x:X):number=>x.a",
  graphql: "query Me{viewer{id name repos(first:3){nodes{name}}}}",
  markdown: "#   Title\n\n-   one\n-   two",
};

const FILENAMES: Record<Language, string> = {
  json: "formatted.json",
  yaml: "formatted.yaml",
  xml: "formatted.xml",
  sql: "formatted.sql",
  html: "formatted.html",
  css: "formatted.css",
  scss: "formatted.scss",
  less: "formatted.less",
  javascript: "formatted.js",
  typescript: "formatted.ts",
  graphql: "formatted.graphql",
  markdown: "formatted.md",
};

const LANGUAGE_SELECT_GROUPS = LANGUAGE_GROUPS.map((g) => ({
  label: g.label,
  options: g.languages.map((id) => ({ value: id, label: LANGUAGES[id].label })),
}));

export default function CodeBeautifyTool() {
  const [language, setLanguage] = useState<Language>("json");
  const [tabWidth, setTabWidth] = useState<TabWidth>("2");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input.trim()) {
      setOutput("");
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Debounce to avoid re-formatting on every keystroke.
    const timer = setTimeout(() => {
      beautify(input, language, { tabWidth: Number(tabWidth) })
        .then((result) => {
          if (cancelled) return;
          setOutput(result);
          setError("");
        })
        .catch((e) => {
          if (cancelled) return;
          setOutput("");
          setError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input, language, tabWidth]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Field label="Language" className="gap-1">
          <Select
            aria-label="Language"
            className="w-44"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            groups={LANGUAGE_SELECT_GROUPS}
          />
        </Field>
        <Field label="Indent" className="gap-1">
          <Segmented<TabWidth>
            aria-label="Indent width"
            size="sm"
            value={tabWidth}
            onChange={setTabWidth}
            options={[
              { value: "2", label: "2 spaces" },
              { value: "4", label: "4 spaces" },
            ]}
          />
        </Field>
      </div>

      <Field label="Code to format">
        <Textarea
          autoFocus
          mono
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={PLACEHOLDERS[language]}
          rows={10}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <OutputArea
        value={output}
        label={loading ? "Formatting…" : "Formatted"}
        filename={FILENAMES[language]}
        placeholder="Formatted code will appear here…"
        rows={12}
      />
    </>
  );
}
