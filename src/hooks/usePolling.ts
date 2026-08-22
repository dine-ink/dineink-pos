import { useEffect } from "react";

// Only sets up the interval — callers that also want an immediate first
// call should invoke it themselves, matching how each existing polling
// site already behaved.
export function usePolling(fn: () => void, intervalMs: number, deps: unknown[] = []) {
  useEffect(() => {
    const id = setInterval(fn, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
