// Whole-day .ics export for the Program page (UX round 2026-07-23). Reuses
// the feed's RFC 5545 primitives (lib/feed/ics.ts) — one VEVENT per upcoming
// slot of the selected day, same UIDs as the per-slot export so re-imports
// update instead of duplicating.

import { slotVeventLines, wrapVcalendar, type IcsSlot } from '@/lib/feed/ics';

/**
 * Multi-event VCALENDAR for a program day. Callers pass only exportable slots
 * (upcoming, not cancelled, start in the future) — this builder does not
 * filter. `now` is injectable for tests (DTSTAMP).
 */
export function buildProgramDayIcs(
  slots: IcsSlot[],
  { now = new Date(), siteUrl = 'https://streamertimes.tv' }: { now?: Date; siteUrl?: string } = {},
): string {
  return wrapVcalendar(slots.flatMap((slot) => slotVeventLines(slot, now, siteUrl)));
}

/** "streamertimes-program-2026-07-23.ics" — keyed by the LOCAL selected day. */
export function programDayIcsFilename(selectedDate: Date): string {
  const y = selectedDate.getFullYear();
  const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const d = String(selectedDate.getDate()).padStart(2, '0');
  return `streamertimes-program-${y}-${m}-${d}.ics`;
}

/** Browser-only: triggers a download of the day's .ics file. */
export function downloadProgramDayIcs(slots: IcsSlot[], selectedDate: Date): void {
  const blob = new Blob([buildProgramDayIcs(slots)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = programDayIcsFilename(selectedDate);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
