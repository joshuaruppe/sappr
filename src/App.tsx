import { type ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme";
import { SettingsProvider } from "@/lib/settings";
import { AuthProvider, useAuth } from "@/lib/auth";
import { RouterProvider, useRouter } from "@/lib/router";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import { LockScreen } from "@/components/auth/LockScreen";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { HomePage } from "@/pages/HomePage";
import { ToolPage } from "@/pages/ToolPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function Routes() {
  const { path } = useRouter();

  if (path === "/" || path === "") return <HomePage />;

  const toolMatch = path.match(/^\/t\/([^/]+)\/?$/);
  if (toolMatch) return <ToolPage id={toolMatch[1]} />;

  return <NotFoundPage />;
}

/** Renders the lock screen instead of the app while protection is engaged. */
function Gate({ children }: { children: ReactNode }) {
  const { locked, unlock } = useAuth();
  if (locked) return <LockScreen onUnlock={unlock} />;
  return <>{children}</>;
}

export function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <Gate>
            <RouterProvider>
              <CommandPaletteProvider>
                <div className="app-backdrop" aria-hidden />
                <div className="flex min-h-screen flex-col">
                  <TopNav />
                  <main className="flex-1 pt-14">
                    <Routes />
                  </main>
                  <Footer />
                </div>
              </CommandPaletteProvider>
            </RouterProvider>
          </Gate>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
