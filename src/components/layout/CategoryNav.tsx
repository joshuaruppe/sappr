import { useRef, useState } from "react";
import * as Menubar from "@radix-ui/react-menubar";
import { Menu as MenuIcon, ChevronRight } from "lucide-react";
import { navStructure, toolsByCategory, getToolById } from "@/registry/registry";
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

const TRIGGER_CLASS =
  "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground";

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
 * Desktop application-style menubar. General categories are bundled into their
 * menu group (Data, Security) as submenus; domain categories (Windows, ...) get
 * their own top-level menu. Opens on hover (with a small intent delay); once one
 * is open, hovering siblings switches instantly. Keyboard nav + outside-click
 * close come from Radix. Driven entirely by the registry's nav structure.
 */
export function CategoryMenubar({ className }: { className?: string }) {
  const { navigate } = useRouter();
  const activeId = useActiveToolId();
  const activeCategory = activeId ? getToolById(activeId)?.meta.category : null;

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

  const pick = (id: string) => navigate(toolHref(id));

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
      {navStructure.map((entry) => {
        // Standalone domain category (e.g. Windows): its own top-level menu.
        if (entry.kind === "category") {
          const { category, tools } = entry;
          return (
            <Menubar.Menu key={category.id} value={category.id}>
              <Menubar.Trigger
                onMouseEnter={() => hoverOpen(category.id)}
                onMouseLeave={clearTimer}
                className={cn(
                  TRIGGER_CLASS,
                  activeCategory === category.id ? "text-foreground" : "text-muted-foreground",
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
                  {tools.map((e) => (
                    <ToolItem
                      key={e.meta.id}
                      entry={e}
                      active={activeId === e.meta.id}
                      onSelect={() => pick(e.meta.id)}
                    />
                  ))}
                </Menubar.Content>
              </Menubar.Portal>
            </Menubar.Menu>
          );
        }

        // Grouped categories (Data, Security): one top-level menu, categories as submenus.
        const { group, categories } = entry;
        const groupActive = categories.some((c) => c.category.id === activeCategory);
        return (
          <Menubar.Menu key={group.id} value={group.id}>
            <Menubar.Trigger
              onMouseEnter={() => hoverOpen(group.id)}
              onMouseLeave={clearTimer}
              className={cn(
                TRIGGER_CLASS,
                groupActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <group.icon className="size-4 opacity-80" strokeWidth={1.75} />
              {group.label}
            </Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content
                align="start"
                sideOffset={6}
                onMouseEnter={clearTimer}
                className={CONTENT_CLASS}
              >
                {categories.map(({ category, tools }) => (
                  <Menubar.Sub key={category.id}>
                    <Menubar.SubTrigger
                      className={cn(
                        ITEM_CLASS,
                        "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
                        activeCategory === category.id && "text-foreground",
                      )}
                    >
                      <category.icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{category.label}</span>
                      <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
                    </Menubar.SubTrigger>
                    <Menubar.Portal>
                      <Menubar.SubContent
                        sideOffset={4}
                        alignOffset={-6}
                        className={CONTENT_CLASS}
                      >
                        {tools.map((e) => (
                          <ToolItem
                            key={e.meta.id}
                            entry={e}
                            active={activeId === e.meta.id}
                            onSelect={() => pick(e.meta.id)}
                          />
                        ))}
                      </Menubar.SubContent>
                    </Menubar.Portal>
                  </Menubar.Sub>
                ))}
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>
        );
      })}
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
