// .ics calendar export for Up Next slots (feed UX round 2026-07-22).
// Pure builder (unit-tested) + a tiny browser download helper. No library —
// a single VEVENT needs ~15 lines of RFC 5545.

import type { StreamSlot } from './types';

/** Slot fields the calendar export needs (subset of StreamSlot). */
export type IcsSlot = Pick<
  StreamSlot,
  'id' | 'streamerName' | 'streamTitle' | 'startTime' | 'duration' | 'category'
>;

/** Slots without a usable duration get a typical stream length. */
const DEFAULT_DURATION_MINUTES = 120;

/** RFC 5545 3.3.11 TEXT escaping: backslash, semicolon, comma, newline. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** ISO date → compact UTC form (20260722T190000Z). */
export function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * The VEVENT block for one slot — shared by the single-slot export and the
 * Program page's whole-day export (lib/program/ics.ts). STATUS:TENTATIVE on
 * purpose — these are predictions, and calendar apps render tentative events
 * distinctly.
 */
export function slotVeventLines(
  slot: IcsSlot,
  now: Date,
  siteUrl = 'https://streamertimes.tv',
): string[] {
  const start = new Date(slot.startTime);
  const minutes =
    Number.isFinite(slot.duration) && slot.duration > 0 ? slot.duration : DEFAULT_DURATION_MINUTES;
  const end = new Date(start.getTime() + minutes * 60_000);

  const summary = `${slot.streamerName} live${slot.category ? `: ${slot.category}` : ''}`;
  const description = `${slot.streamTitle}\nPredicted by Streamer Times — times can shift.`;

  return [
    'BEGIN:VEVENT',
    `UID:${slot.id}@streamertimes.tv`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${siteUrl}/schedule/${encodeURIComponent(slot.id)}`,
    'STATUS:TENTATIVE',
    'END:VEVENT',
  ];
}

/** VCALENDAR wrapper shared by both exports. */
export function wrapVcalendar(eventLines: string[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Streamer Times//Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventLines,
    'END:VCALENDAR',
  ];
  // RFC 5545 requires CRLF line endings.
  return lines.join('\r\n') + '\r\n';
}

/**
 * Builds a single-event VCALENDAR for a predicted/announced slot. Lines are
 * not folded (RFC recommends ≤75 octets, but every mainstream client accepts
 * long lines).
 *
 * `now` is injectable for tests (DTSTAMP).
 */
export function buildSlotIcs(
  slot: IcsSlot,
  { now = new Date(), siteUrl = 'https://streamertimes.tv' }: { now?: Date; siteUrl?: string } = {},
): string {
  return wrapVcalendar(slotVeventLines(slot, now, siteUrl));
}

/** "papaplatte-2026-07-22.ics" — safe cross-platform filename. */
export function slotIcsFilename(slot: IcsSlot): string {
  const name =
    slot.streamerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'stream';
  return `${name}-${slot.startTime.slice(0, 10)}.ics`;
}

/** Browser-only: triggers a download of the slot's .ics file. */
export function downloadSlotIcs(slot: IcsSlot): void {
  const blob = new Blob([buildSlotIcs(slot)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = slotIcsFilename(slot);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
