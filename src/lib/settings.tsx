import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Which offline cracker the user works with — drives the commands/flags shown. */
export type Cracker = "hashcat" | "john" | "both";

/** App-wide preferences (theme lives in its own provider). Extend freely. */
export interface Settings {
  cracker: Cracker;
}

const DEFAULTS: Settings = { cracker: "both" };
const STORAGE_KEY = "sappr.settings";

interface SettingsContextValue extends Settings {
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function load(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    // Validate the union rather than trusting stored JSON — a corrupt or
    // hand-edited value would otherwise disable every cracker command.
    const cracker =
      parsed?.cracker === "hashcat" ||
      parsed?.cracker === "john" ||
      parsed?.cracker === "both"
        ? parsed.cracker
        : DEFAULTS.cracker;
    return { cracker };
  } catch {
    return DEFAULTS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ ...settings, update }),
    [settings, update],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within <SettingsProvider>");
  return ctx;
}

/** Convenience flags derived from the cracker preference. */
export function useCrackers() {
  const { cracker } = useSettings();
  return {
    hashcat: cracker === "hashcat" || cracker === "both",
    john: cracker === "john" || cracker === "both",
  };
}
