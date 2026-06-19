import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Command } from "cmdk";
import { Monitor, Search } from "lucide-react";
import { getToolsByCategory } from "@/registry/registry";
import { useRouter, toolHref } from "@/lib/router";
import { useTheme } from "@/lib/theme";

interface PaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function useCommandPalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within provider");
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { navigate } = useRouter();
  const { cycle } = useTheme();

  const toggle = useCallback(() => setOpen((o) => !o), []);

  // Global ⌘K / Ctrl+K shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  const groups = useMemo(() => getToolsByCategory(), []);

  const value = useMemo<PaletteContextValue>(
    () => ({ open, setOpen, toggle }),
    [open, toggle],
  );

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <PaletteContext.Provider value={value}>
      {children}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command menu"
        shouldFilter
        className="flex flex-col"
        overlayClassName="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm data-[state=open]:animate-in-fade"
        contentClassName="fixed left-1/2 top-[18%] z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Command.Input
            autoFocus
            placeholder="Search tools, paste a hash, run a command…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain p-2">
          <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
            No matching tools.
          </Command.Empty>

          {groups.map(({ category, tools }) => (
            <Command.Group
              key={category.id}
              heading={category.label}
              className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.7rem] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {tools.map(({ meta }) => {
                const Icon = meta.icon;
                return (
                  <Command.Item
                    key={meta.id}
                    value={`${meta.title} ${meta.category} ${(meta.keywords ?? []).join(" ")}`}
                    keywords={meta.keywords}
                    onSelect={() => run(() => navigate(toolHref(meta.id)))}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{meta.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {meta.description}
                    </span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}

          <Command.Group
            heading="General"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.7rem] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            <Command.Item
              value="toggle theme appearance dark light system"
              onSelect={() => run(cycle)}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm data-[selected=true]:bg-accent"
            >
              <Monitor className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">Toggle theme</span>
            </Command.Item>
            <Command.Item
              value="home all tools browse"
              onSelect={() => run(() => navigate("/"))}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm data-[selected=true]:bg-accent"
            >
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">Browse all tools</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </PaletteContext.Provider>
  );
}
