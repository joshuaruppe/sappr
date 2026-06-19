import * as Popover from "@radix-ui/react-popover";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { useSettings, type Cracker } from "@/lib/settings";
import { PasswordSettings } from "@/components/auth/PasswordSettings";

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <p className="text-[0.7rem] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SettingsMenu() {
  const { mode, setMode } = useTheme();
  const { cracker, update } = useSettings();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings2 className="size-4.5" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-72 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl data-[state=open]:animate-in-fade"
        >
          <div className="flex flex-col gap-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Settings
            </div>

            <Section label="Theme">
              <Segmented<ThemeMode>
                aria-label="Theme"
                size="sm"
                fluid
                value={mode}
                onChange={setMode}
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "system", label: "Auto" },
                ]}
              />
            </Section>

            <Section
              label="Cracking tool"
              hint="Sets which crack commands and flags the tools show."
            >
              <Segmented<Cracker>
                aria-label="Cracking tool"
                size="sm"
                fluid
                value={cracker}
                onChange={(v) => update({ cracker: v })}
                options={[
                  { value: "hashcat", label: "hashcat" },
                  { value: "john", label: "John" },
                  { value: "both", label: "Both" },
                ]}
              />
            </Section>

            <div className="h-px bg-border/60" />

            <Section label="Security">
              <PasswordSettings />
            </Section>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
