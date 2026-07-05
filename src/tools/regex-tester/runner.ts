import type { RegexResult } from "./logic";

/** How long a single match is allowed to run before we assume catastrophic
 * backtracking and kill it. */
const TIMEOUT_MS = 1500;

/**
 * Run a regex in a Web Worker with a hard timeout, so a pathological pattern
 * (e.g. `(a+)+$` against a long non-match) can't hang the browser tab. The
 * worker is single-shot: spawned per call and always terminated, which keeps
 * concurrent/rapid calls from racing on a shared instance.
 */
export function runRegexAsync(
  pattern: string,
  flags: string,
  text: string,
): Promise<RegexResult> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./regex.worker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      // Workers unavailable (very old runtime): fall back to a direct call.
      void import("./logic").then(({ runRegex }) =>
        resolve(runRegex(pattern, flags, text)),
      );
      return;
    }

    const finish = (r: RegexResult): void => {
      clearTimeout(timer);
      worker.terminate();
      resolve(r);
    };

    const timer = setTimeout(
      () =>
        finish({
          matches: [],
          error:
            "Pattern timed out (over 1.5s) — this usually means catastrophic backtracking. Simplify nested quantifiers such as (a+)+ or (a|a)+.",
        }),
      TIMEOUT_MS,
    );

    worker.onmessage = (e: MessageEvent<RegexResult>) => finish(e.data);
    worker.onerror = () => finish({ matches: [], error: "Regex evaluation failed." });
    worker.postMessage({ pattern, flags, text });
  });
}
