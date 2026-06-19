import { useRef, useState } from "react";
import * as Menubar from "@radix-ui/react-menubar";
import { Menu as MenuIcon } from "lucide-react";
import { toolsByCategory, getToolById } from "@/registry/registry";
import { executionOf } from "@/registry/execution";
import { useRouter, useActiveToolId, toolHref } from "@/lib/router";
import { cn } from "@/lib/utils";
import type { ToolEntry } from "@/registry/registry";

const CONTENT_CLASS =
  "z-50 min-w-[15rem] overflow-hidden rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-xl data-[state=open]:animate-in-fade";

const ITEM_CLASS =
  "flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground";

const HEADING_CLASS =
  "flex items-center gap-1.5 px-2 py-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground";

/** A single tool row with its icon, title and execution dot. */
function ToolItem({
  entry,
  active,
  onSelect,
}: {
  entry: ToolEntry;
  active: boolean;
  onSelect: () => void;
}) {
  const { meta } = entry;
  const Icon = meta.icon;
  const exec = executionOf(meta.execution);
  return (
    <Menubar.Item
      onSelect={onSelect}
      className={cn(ITEM_CLASS, active && "bg-accent/60 text-accent-foreground")}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="font-medium">{meta.title}</span>
      <span
        role="img"
        title={exec.label}
        aria-label={exec.label}
        className={cn("ml-auto size-1.5 shrink-0 rounded-full", exec.dotClass)}
      />
    </Menubar.Item>
  );
}

/**
 * Desktop application-style menubar: one menu per category, its tools inside.
 * Opens on hover (with a small intent delay so cursor sweeps don't fire menus);
 * once one is open, hovering siblings switches instantly. Full keyboard nav and
 * outside-click/Escape close come from Radix. Driven entirely by the registry.
 */
export function CategoryMenubar({ className }: { className?: string }) {
  const { navigate } = useRouter();
  const activeId = useActiveToolId();
  const activeCategory = activeId ? getToolById(activeId)?.meta.category : null;
  const groups = toolsByCategory;

  const [value, setValue] = useState("");
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }
  function hoverOpen(id: string) {
    clearTimer();
    if (value) {
      setValue(id); // a menu is already open — switch immediately
    } else {
      openTimer.current = setTimeout(() => setValue(id), 90);
    }
  }

  return (
    <Menubar.Root
      loop
      value={value}
      onValueChange={setValue}
      className={cn(
        "flex items-center gap-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {groups.map(({ category, tools }) => (
        <Menubar.Menu key={category.id} value={category.id}>
          <Menubar.Trigger
            onMouseEnter={() => hoverOpen(category.id)}
            onMouseLeave={clearTimer}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium outline-none transition-colors",
              "hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground",
              activeCategory === category.id
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            <category.icon className="size-4 opacity-80" strokeWidth={1.75} />
            {category.short}
          </Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content
              align="start"
              sideOffset={6}
              onMouseEnter={clearTimer}
              className={CONTENT_CLASS}
            >
              <div className={HEADING_CLASS}>{category.label}</div>
              {tools.map((entry) => (
                <ToolItem
                  key={entry.meta.id}
                  entry={entry}
                  active={activeId === entry.meta.id}
                  onSelect={() => navigate(toolHref(entry.meta.id))}
                />
              ))}
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
      ))}
    </Menubar.Root>
  );
}

/**
 * Compact variant for narrow screens: a single "Tools" menu listing every
 * category and its tools in one scrollable dropdown.
 */
export function MobileToolsMenu({ className }: { className?: string }) {
  const { navigate } = useRouter();
  const activeId = useActiveToolId();
  const groups = toolsByCategory;

  return (
    <Menubar.Root className={className}>
      <Menubar.Menu>
        <Menubar.Trigger className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground">
          <MenuIcon className="size-4.5" />
          Tools
        </Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content
            align="start"
            sideOffset={6}
            className={cn(CONTENT_CLASS, "max-h-[72vh] overflow-y-auto")}
          >
            {groups.map(({ category, tools }, i) => (
              <div key={category.id}>
                {i > 0 && <Menubar.Separator className="my-1 h-px bg-border" />}
                <div className={HEADING_CLASS}>
                  <category.icon className="size-3.5" />
                  {category.label}
                </div>
                {tools.map((entry) => (
                  <ToolItem
                    key={entry.meta.id}
                    entry={entry}
                    active={activeId === entry.meta.id}
                    onSelect={() => navigate(toolHref(entry.meta.id))}
                  />
                ))}
              </div>
            ))}
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>
    </Menubar.Root>
  );
}
