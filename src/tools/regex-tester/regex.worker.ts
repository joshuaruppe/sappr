/// <reference lib="webworker" />
import { runRegex } from "./logic";

// Runs regex matching off the main thread so a catastrophically-backtracking
// pattern can't freeze the UI — the caller terminates this worker on timeout.
self.onmessage = (
  e: MessageEvent<{ pattern: string; flags: string; text: string }>,
) => {
  const { pattern, flags, text } = e.data;
  (self as unknown as Worker).postMessage(runRegex(pattern, flags, text));
};
