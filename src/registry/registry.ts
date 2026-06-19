import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ToolMeta } from "./types";
import { CATEGORIES, CATEGORY_LIST, type CategoryInfo } from "./categories";

/**
 * Auto-discovering tool registry.
 *
 * Every tool is a folder under `src/tools/<id>/` containing:
 *   - `meta.ts`  — exports `meta: ToolMeta` (loaded eagerly; tiny)
 *   - `Tool.tsx` — default-exports the React component (code-split, lazy)
 *
 * Dropping in a new folder registers the tool everywhere (nav, palette,
 * launcher, routing). No central list to edit — this is the plugin-style
 * extensibility CyberChef lacks.
 */

interface MetaModule {
  meta: ToolMeta;
}
type ComponentModule = { default: ComponentType };

const metaModules = import.meta.glob<MetaModule>("../tools/*/meta.ts", {
  eager: true,
});
const componentModules = import.meta.glob<ComponentModule>("../tools/*/Tool.tsx");

export interface ToolEntry {
  meta: ToolMeta;
  Component: LazyExoticComponent<ComponentType>;
}

function dirOf(path: string): string {
  const m = path.match(/\/tools\/([^/]+)\//);
  return m ? m[1] : path;
}

function buildEntries(): ToolEntry[] {
  const out: ToolEntry[] = [];
  const componentByDir = new Map<string, () => Promise<ComponentModule>>();
  for (const [path, loader] of Object.entries(componentModules)) {
    componentByDir.set(dirOf(path), loader);
  }

  for (const [path, mod] of Object.entries(metaModules)) {
    const dir = dirOf(path);
    const loader = componentByDir.get(dir);
    if (!loader) {
      if (import.meta.env.DEV) {
        console.warn(`[registry] tool "${dir}" has meta.ts but no Tool.tsx`);
      }
      continue;
    }
    if (mod.meta.id !== dir && import.meta.env.DEV) {
      console.warn(
        `[registry] tool "${dir}" declares id "${mod.meta.id}" — id should match the folder name`,
      );
    }
    out.push({ meta: mod.meta, Component: lazy(loader) });
  }

  // Sort by category order, then alphabetically by title.
  out.sort((a, b) => {
    const ca = CATEGORIES[a.meta.category]?.order ?? 999;
    const cb = CATEGORIES[b.meta.category]?.order ?? 999;
    if (ca !== cb) return ca - cb;
    return a.meta.title.localeCompare(b.meta.title);
  });

  return out;
}

export const tools: ToolEntry[] = buildEntries();

const byId = new Map(tools.map((t) => [t.meta.id, t]));

export function getToolById(id: string): ToolEntry | undefined {
  return byId.get(id);
}

export interface CategoryGroup {
  category: CategoryInfo;
  tools: ToolEntry[];
}

/** Tools grouped by category, in display order, omitting empty categories. */
export function getToolsByCategory(): CategoryGroup[] {
  return CATEGORY_LIST.map((category) => ({
    category,
    tools: tools.filter((t) => t.meta.category === category.id),
  })).filter((g) => g.tools.length > 0);
}

/**
 * Precomputed category grouping. The tool set is fixed at module load, so the
 * result never changes — compute it once instead of per render in nav/home.
 */
export const toolsByCategory: CategoryGroup[] = getToolsByCategory();

export const toolCount = tools.length;
