import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Contains a render/runtime error from a subtree (e.g. a single tool) so it
 * shows a recoverable message instead of blanking the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-red-500">
            Something went wrong in this tool
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            An unexpected error occurred while rendering it. The rest of the app is
            unaffected — you can retry or pick another tool.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
          <button
            onClick={this.reset}
            className="mt-4 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
