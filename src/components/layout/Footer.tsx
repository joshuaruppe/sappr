import { Github } from "lucide-react";
import {
  APP_TAGLINE,
  APP_VERSION,
  AUTHOR_NAME,
  AUTHOR_URL,
  REPO_URL,
} from "@/lib/version";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <span>
          <span className="font-mono font-medium text-foreground">sappr</span>{" "}
          · {APP_TAGLINE}. Built by{" "}
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            {AUTHOR_NAME}
          </a>
          .
        </span>
        <div className="flex items-center gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            title="Source on GitHub"
            aria-label="Source on GitHub"
            className="transition-colors hover:text-foreground"
          >
            <Github className="size-4" />
          </a>
          <span aria-hidden className="text-border">
            •
          </span>
          <span className="font-mono">v{APP_VERSION}</span>
        </div>
      </div>
    </footer>
  );
}
