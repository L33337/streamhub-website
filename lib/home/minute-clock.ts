/**
 * A minute-resolution clock as an external store, for client islands whose
 * RENDER OUTPUT depends on the current time — not just their DOM mutations.
 *
 * The homepage has both kinds. HomeLiveRailFilters only ever writes the clock
 * into existing nodes (runtime labels, `hidden` flags), so a plain
 * `useState(() => Date.now())` is safe there. The lineup's time dropdown is
 * different: its option list and counts are derived from the current day AND
 * the viewer's timezone, so rendering them from a server clock produces markup
 * the client cannot reproduce — a hydration mismatch, and before that a set of
 * counts computed for whichever timezone the build machine happened to run in
 * (verified 2026-07-30: the prerendered HTML carried "From 8:00 PM (36)").
 *
 * `useSyncExternalStore` is React's sanctioned answer: the server snapshot is
 * `null` ("no clock yet"), which callers render as the timezone-neutral state,
 * and the client swaps in the real clock right after hydration. This also
 * keeps us clear of `react-hooks/set-state-in-effect`, which rules out the
 * `useState` + `useEffect(() => setMounted(true))` shortcut (see
 * LocaleSuggestionBanner, fixed the same way).
 */

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Cached so getSnapshot is referentially stable between notifications —
 * returning a fresh Date.now() on every call would make React re-render
 * forever.
 */
let snapshot = Date.now();

export function subscribeMinuteClock(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (timer === null) {
    timer = setInterval(() => {
      snapshot = Date.now();
      for (const listener of listeners) listener();
    }, 60_000);
  }
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Client snapshot: the real clock, updated once a minute. */
export function getMinuteClockSnapshot(): number {
  return snapshot;
}

/**
 * Server snapshot: deliberately no clock. Callers must treat `null` as "the
 * timezone and the current time are unknown" and render the neutral state.
 */
export function getServerMinuteClockSnapshot(): null {
  return null;
}
