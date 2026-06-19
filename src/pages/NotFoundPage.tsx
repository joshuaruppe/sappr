import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/router";

export function NotFoundPage({
  title = "Page not found",
  detail = "That route doesn't exist.",
}: {
  title?: string;
  detail?: string;
}) {
  const { navigate } = useRouter();
  return (
    <div className="animate-in-fade mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-card/70 text-primary">
        <Compass className="size-6" />
      </div>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      <Button variant="primary" className="mt-5" onClick={() => navigate("/")}>
        Browse all tools
      </Button>
    </div>
  );
}
