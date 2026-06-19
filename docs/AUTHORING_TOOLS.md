# Authoring a sappr tool

A tool is a self-contained folder under `src/tools/<id>/`. Dropping the folder
in registers it everywhere (home grid, command palette, routing); there is **no
central list to edit**. The registry auto-discovers tools via `import.meta.glob`.

## Folder contract

```
src/tools/<id>/
  meta.ts          # exports `meta: ToolMeta` (tiny, loaded eagerly)
  Tool.tsx         # DEFAULT-exports the React component (code-split, lazy)
  logic.ts         # pure functions, no DOM/React; safe for tests & workers
  logic.test.ts    # vitest unit tests for logic.ts
```

- `<id>` MUST be URL-safe and MUST equal `meta.id` and the folder name.
- `Tool.tsx` MUST `export default` the component.
- Put all real work in `logic.ts` as **pure functions** and unit-test them.
  `Tool.tsx` is just the UI wiring.

## `meta.ts`

```ts
import { SomeIcon } from "lucide-react";
import type { ToolMeta } from "@/registry/types";

export const meta: ToolMeta = {
  id: "my-tool",                 // === folder name
  title: "My Tool",
  description: "One concise line; shown on cards and tooltips.",
  category: "encoding",          // see categories below
  icon: SomeIcon,                // any lucide-react icon
  keywords: ["synonym", "abbr"], // extra search terms
  execution: "client",           // all MVP tools are "client"
  status: "stable",              // "stable" | "beta" | "wip"
};
```

Categories: `encoding`, `crypto`, `formatting`, `regex`, `convert`,
`generate`, `network`, `forensics`.

## `Tool.tsx`

- The page already renders the **header** (icon/title/description/badges) via
  `ToolShell`. **Do NOT render your own page header.** Return only the tool body.
- Wrap the component as `export default function MyTool() { ... }`.
- Compute output from input with `useMemo` for cheap/sync work; use
  `useState` + `useEffect` for async (e.g. hashing, QR, prettier) and show a
  loading state.
- Always `try/catch` and surface failures via `<ErrorNote>`. Never throw to the
  user.
- Client-side only. Never send input anywhere. No `eval` of user input.

## Available primitives (import from these exact paths)

```ts
import { Button } from "@/components/ui/button";
//   variant: "primary"|"secondary"|"outline"|"ghost"|"destructive"; size: "sm"|"md"|"lg"|"icon"
import { Input } from "@/components/ui/input";          // standard <input>
import { Textarea } from "@/components/ui/textarea";    // prop: mono?: boolean (default true)
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";          // variant: default|outline|primary|success|warning|muted
import { Segmented } from "@/components/ui/segmented";  // <Segmented<T> options value onChange aria-label size?/>
import { Switch } from "@/components/ui/switch";        // checked onChange(checked) label? title? disabled?
import { CopyButton } from "@/components/ui/copy-button"; // value: string, label?
import { Label } from "@/components/ui/label";
```

Tool building blocks:

```ts
import { Field, OutputArea, ErrorNote, FileDrop } from "@/components/tool/parts";
// Field:      { label?, hint?, actions?, children, className? }
// OutputArea: { value: string, label?, filename?, placeholder?, mono?, rows? }  (has copy + download + byte count)
// ErrorNote:  { children }   (renders nothing if children is falsy)
// FileDrop:   { onFile: (file: File) => void, accept?, hint?, className? }
```

Utilities & icons:

```ts
import { cn, copyToClipboard, downloadBlob, formatBytes } from "@/lib/utils";
import { Foo } from "lucide-react";
```

`Segmented` example (mode toggle):

```tsx
<Segmented<"encode" | "decode">
  aria-label="Mode"
  value={mode}
  onChange={setMode}
  options={[{ value: "encode", label: "Encode" }, { value: "decode", label: "Decode" }]}
/>
```

## Reference implementation

Read `src/tools/base64/` (meta.ts, Tool.tsx, logic.ts, logic.test.ts). Copy its
structure, layout density, error handling and test style exactly.

## Hard rules

- Do **not** run `npm install` or add dependencies. All needed libs are already
  installed; import them directly.
- Do **not** edit any shared file (registry, categories, vite config, other
  tools, primitives). Stay entirely inside your `src/tools/<id>/` folder.
- Keep visual style consistent with base64: use `Field` + `OutputArea`, the
  same spacing, `text-sm`, monospace for data.
- Keyboard/paste friendly, no layout shift, works in light & dark.
- A tool's component returns a React fragment of stacked `Field`s; the parent
  already provides `flex flex-col gap-5` spacing.
