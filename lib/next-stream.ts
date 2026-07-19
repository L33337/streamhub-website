// Pure view-model helpers for the "Next stream" column on the /rankings
// leaderboards. Kept out of lib/server/ so they stay unit-testable
// (lib/__tests__/next-stream.test.ts) — the fetching half lives in
// lib/server/next-streams.ts.

/**
 * Earliest upcoming slot per streamer from a flat slot list. The partner API
 * already orders by start_time ascending, but the reducer compares anyway so
 * correctness never depends on transport ordering (e.g. when several
 * paginated chunks are concatenated).
 */
export function pickEarliestSlotPerStreamer<
  T extends { streamer_id: string; start_time: string },
>(slots: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const slot of slots) {
    const current = map.get(slot.streamer_id);
    if (!current || Date.parse(slot.start_time) < Date.parse(current.start_time)) {
      map.set(slot.streamer_id, slot);
    }
  }
  return map;
}

/**
 * Compact English label for an upcoming start time: "Today 8:00 PM",
 * "Tomorrow 6:00 PM", "Sat 8:00 PM". Day boundaries are judged on the
 * calendar date in the target zone (23:30 UTC can already be "Tomorrow" in
 * Berlin). `timeZone` defaults to the runtime's zone — the browser's on the
 * client; tests inject a fixed zone for determinism. The 7-day fetch window
 * (lib/server/next-streams.ts) keeps the bare weekday form unambiguous.
 */
export function nextStreamLabel(
  iso: string,
  opts: { now?: Date; timeZone?: string } = {},
): string {
  const { now = new Date(), timeZone } = opts;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const zone = timeZone ? { timeZone } : {};
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    ...zone,
  });
  // en-CA yields YYYY-MM-DD — a zone-local calendar date we can diff in UTC.
  const dayFmt = new Intl.DateTimeFormat('en-CA', zone);
  const diffDays = Math.round(
    (Date.parse(`${dayFmt.format(d)}T00:00:00Z`) -
      Date.parse(`${dayFmt.format(now)}T00:00:00Z`)) /
      86_400_000,
  );
  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Tomorrow ${time}`;
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short', ...zone });
  return `${weekday} ${time}`;
}
