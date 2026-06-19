import { Logo } from "./Logo";
import { SettingsMenu } from "./SettingsMenu";
import { CategoryMenubar, MobileToolsMenu } from "./CategoryNav";
import { useRouter } from "@/lib/router";

export function TopNav() {
  const { navigate } = useRouter();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <button
          onClick={() => navigate("/")}
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="sappr home"
        >
          <Logo />
        </button>

        {/* Primary navigation: category menus. Hamburger on narrow screens. */}
        <MobileToolsMenu className="lg:hidden" />
        <CategoryMenubar className="ml-1 hidden min-w-0 flex-1 overflow-x-auto lg:flex" />

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}
