// --- Streamer-local wall clock → viewer's clock ---------------------------------
//
// The Partner API's /stats endpoint returns typical streaming times as bare
// "HH:MM" strings in the STREAMER's home timezone. Rendering those next to a
// schedule that shows viewer-local times gives the page two competing time
// frames, so the weekday table converts them — which needs a real instant
// (DST makes a bare offset wrong half the year) and can move the time across a
// calendar-day boundary (Monday 01:00 in Berlin is Sunday evening in New York).
//
// Pure functions, no DOM: the component layer decides WHEN to convert (client
// only — the viewer's zone is unknown while rendering on the server).

const SHORT_EN_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ZoneParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

/** Calendar + wall-clock parts of `date` as seen in `timeZone`. */
function partsInZone(date: Date, timeZone: string): ZoneParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/** ISO weekday index (0 = Monday … 6 = Sunday); runtime zone when tz is null. */
export function isoWeekdayInZone(date: Date, timeZone: string | null): number {
  if (!timeZone) return (date.getDay() + 6) % 7;
  const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(
    date,
  );
  const idx = SHORT_EN_WEEKDAYS.indexOf(short);
  return idx >= 0 ? idx : (date.getUTCDay() + 6) % 7;
}

/**
 * The UTC instant at which `timeZone`'s wall clock reads the given date+time.
 *
 * Standard two-pass resolution: interpret the wall clock as UTC, ask the zone
 * what it displays at that instant, and correct by the difference. On the two
 * DST transition days a wall clock can be ambiguous (repeated hour) or
 * non-existent (skipped hour); both resolve to a neighbouring real instant,
 * which is within the hour of accuracy this table claims anyway.
 */
export function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const shown = partsInZone(new Date(guess), timeZone);
  const shownAsUtc = Date.UTC(
    shown.year,
    shown.month - 1,
    shown.day,
    shown.hour,
    shown.minute,
  );
  return new Date(guess - (shownAsUtc - guess));
}

export interface ViewerWeekdayTime {
  /** Localized time in the viewer's zone, e.g. "1:00 PM" / "13:00". */
  time: string;
  /**
   * ISO index of the weekday this lands on in the viewer's zone, or null when
   * it stays on the row's own weekday. Non-null means the row's label would
   * otherwise lie, so the caller prefixes the shifted day.
   */
  shiftedWeekday: number | null;
}

/**
 * Converts one "HH:MM" streamer-local time on `isoWeekday` (0 = Monday) into
 * the viewer's zone.
 *
 * The instant is anchored to the NEXT occurrence of that weekday so the
 * conversion uses the DST offset the viewer will actually experience, not
 * whatever was true six months ago. Returns null for unparseable input or an
 * unusable zone, so callers can fall back to the raw streamer-local string.
 *
 * `viewerZone` defaults to the runtime zone (the browser's); tests pass a fixed
 * zone for determinism.
 */
export function toViewerWeekdayTime(
  hhmm: string,
  isoWeekday: number,
  fromZone: string,
  lang = 'en',
  opts: { now?: Date; viewerZone?: string } = {},
): ViewerWeekdayTime | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  const { now = new Date(), viewerZone } = opts;
  try {
    // Next date (within a week) whose weekday in the STREAMER's zone matches
    // the row — the row's weekday is streamer-local, so it must be resolved
    // there, not in UTC.
    let anchor: ZoneParts | null = null;
    for (let k = 0; k < 7; k++) {
      const probe = new Date(now.getTime() + k * 86_400_000);
      if (isoWeekdayInZone(probe, fromZone) === isoWeekday) {
        anchor = partsInZone(probe, fromZone);
        break;
      }
    }
    if (!anchor || !Number.isFinite(anchor.year)) return null;

    const instant = zonedWallClockToUtc(
      anchor.year,
      anchor.month,
      anchor.day,
      hour,
      minute,
      fromZone,
    );
    if (Number.isNaN(instant.getTime())) return null;

    const locale = lang === 'en' ? 'en-US' : lang;
    const time = instant.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      ...(viewerZone ? { timeZone: viewerZone } : {}),
    });
    const viewerIso = isoWeekdayInZone(instant, viewerZone ?? null);
    return { time, shiftedWeekday: viewerIso === isoWeekday ? null : viewerIso };
  } catch {
    return null;
  }
}
