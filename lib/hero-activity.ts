// Hero activity line for an offline streamer with nothing scheduled
// (streamer-page UX round, 2026-09-26). Pure and unit-tested
// (lib/__tests__/hero-activity.test.ts); the page turns the result into
// viewer-locale copy.
//
// Why: a streamer on a break (kaicenat, 2026-09-24) showed no next-stream
// pill, then seven "No streams expected" rows — the one question a visitor
// had ("is he coming back?") got no answer at all. The line states what we
// actually know: the last stream, an announced break with an end date, and
// whether the silence is unusual for THIS streamer's rhythm.
//
// ISR: everything here is absolute (dates, never "9 days ago"), so the cached
// HTML stays byte-stable within a render window. `now` is the render time.

export type HeroActivity =
  | { kind: 'break'; until: string }
  | { kind: 'quiet'; lastStreamAt: string }
  | { kind: 'recent'; lastStreamAt: string };

/** Silence shorter than this is never "unusual", whatever the rhythm. */
export const QUIET_MIN_DAYS = 7;
/**
 * Silence counts as unusual beyond this multiple of the streamer's own typical
 * gap. 2.5 mirrors the slot computer's cold-gate LOW cap (COLD_RATIO_LOW_CAP),
 * the point from which predictions stop trusting the weekly pattern too.
 */
export const QUIET_RATIO = 2.5;

const DAY_MS = 86_400_000;

function parse(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function heroActivity(input: {
  /** PublicStreamer.last_stream_at, falling back to the newest history item. */
  lastStreamAt: string | null | undefined;
  /** Insights `vacation_until` (Twitch vacation / announced time off). */
  vacationUntil: string | null | undefined;
  /** Stats streams_per_week (28 d); null/undefined = unknown rhythm. */
  streamsPerWeek: number | null | undefined;
  now: Date;
}): HeroActivity | null {
  const now = input.now.getTime();
  const until = parse(input.vacationUntil);
  if (until !== null && until > now) {
    return { kind: 'break', until: new Date(until).toISOString() };
  }
  const last = parse(input.lastStreamAt);
  if (last === null || last > now) return null;

  const silenceDays = (now - last) / DAY_MS;
  const perWeek = input.streamsPerWeek;
  const typicalGapDays = perWeek && perWeek > 0 ? 7 / perWeek : 7;
  const threshold = Math.max(QUIET_MIN_DAYS, QUIET_RATIO * typicalGapDays);
  const lastStreamAt = new Date(last).toISOString();
  return silenceDays > threshold ? { kind: 'quiet', lastStreamAt } : { kind: 'recent', lastStreamAt };
}
