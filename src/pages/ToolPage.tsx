import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { getToolById } from "@/registry/registry";
import { CATEGORIES } from "@/registry/categories";
import { ToolShell } from "@/components/tool/ToolShell";
import { Loading } from "@/components/layout/Loading";
import { NotFoundPage } from "./NotFoundPage";
import { useRouter } from "@/lib/router";

export function ToolPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const entry = getToolById(id);

  if (!entry) {
    return <NotFoundPage title="Unknown tool" detail={`No tool with id “${id}”.`} />;
  }

  const { meta, Component } = entry;
  const category = CATEGORIES[meta.category];

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6"
      >
        <ol className="flex items-center gap-1.5 text-xs">
          <li>
            <button
              onClick={() => navigate("/")}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              All tools
            </button>
          </li>
          <li aria-hidden className="text-border">
            <ChevronRight className="size-3.5" />
          </li>
          <li className="text-foreground" aria-current="page">
            {category.label}
          </li>
        </ol>
      </nav>
      <ToolShell meta={meta}>
        <Suspense fallback={<Loading />}>
          <Component />
        </Suspense>
      </ToolShell>
    </>
  );
}
