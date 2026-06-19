import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { getToolById } from "@/registry/registry";
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

  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
          All tools
        </button>
      </div>
      <ToolShell meta={meta}>
        <Suspense fallback={<Loading />}>
          <Component />
        </Suspense>
      </ToolShell>
    </>
  );
}
