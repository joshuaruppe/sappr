import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Tiny hash-based router. Hash routing keeps the whole app a single static
 * file (trivial self-hosting, no server rewrite rules) and — importantly for a
 * security tool — lets tools stash large/sensitive state in the fragment, which
 * is never sent to the server or written to access logs.
 *
 * Hash format: `#/<path>?<query>` e.g. `#/t/base64?in=...`
 */

export interface AppLocation {
  /** Path portion, always begins with "/". */
  path: string;
  /** Parsed query params from the hash. */
  query: URLSearchParams;
}

function parseHash(): AppLocation {
  const raw = window.location.hash.replace(/^#/, "");
  const qIndex = raw.indexOf("?");
  const path = (qIndex === -1 ? raw : raw.slice(0, qIndex)) || "/";
  const queryStr = qIndex === -1 ? "" : raw.slice(qIndex + 1);
  return {
    path: path.startsWith("/") ? path : `/${path}`,
    query: new URLSearchParams(queryStr),
  };
}

interface RouterContextValue extends AppLocation {
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<AppLocation>(() =>
    typeof window === "undefined"
      ? { path: "/", query: new URLSearchParams() }
      : parseHash(),
  );

  useEffect(() => {
    const onChange = () => setLocation(parseHash());
    window.addEventListener("hashchange", onChange);
    // Ensure we have a hash on first load.
    if (!window.location.hash) window.location.hash = "#/";
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const target = to.startsWith("#") ? to : `#${to.startsWith("/") ? to : `/${to}`}`;
    if (opts?.replace) {
      const url = `${window.location.pathname}${window.location.search}${target}`;
      window.history.replaceState(null, "", url);
      setLocation(parseHash());
    } else {
      window.location.hash = target;
    }
    // Scroll to top on navigation for a fresh-page feel.
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo<RouterContextValue>(
    () => ({ ...location, navigate }),
    [location, navigate],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter must be used within <RouterProvider>");
  return ctx;
}

/** Convenience: the active tool id, or null on non-tool routes. */
export function useActiveToolId(): string | null {
  const { path } = useRouter();
  const m = path.match(/^\/t\/([^/]+)/);
  return m ? m[1] : null;
}

/** Build an in-app href for a tool. */
export function toolHref(id: string): string {
  return `#/t/${id}`;
}
