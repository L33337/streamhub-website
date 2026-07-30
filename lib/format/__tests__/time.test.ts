import { describe, it, expect } from 'vitest';
import {
  absoluteStartLabel,
  formatDuration,
  formatUtcDateShort,
  localDateKey,
  localizedNextLabel,
  pickNextRealSlot,
  safeTimeZone,
  sevenDayKeys,
  utcDateAbsoluteLabel,
  utcDateLabel,
  utcDateShortLabel,
} from '../time';

const TODAY = '2026-07-11';

describe('utcDateLabel / utcDateShortLabel — English default (bleed guard)', () => {
  it('keeps the legacy literals', () => {
    expect(utcDateLabel(TODAY, TODAY)).toBe('Today');
    expect(utcDateLabel('2026-07-12', TODAY)).toBe('Tomorrow');
    expect(utcDateLabel('2026-07-14', TODAY)).toBe('Tue, Jul 14');
    expect(utcDateShortLabel(TODAY, TODAY)).toBe('Today');
    expect(utcDateShortLabel('2026-07-12', TODAY)).toBe('Tomorrow');
    expect(utcDateShortLabel('2026-07-14', TODAY)).toBe('Tue');
  });
});

describe('utcDateLabel / utcDateShortLabel — localized', () => {
  it('localizes today/tomorrow via Intl with capitalization', () => {
    expect(utcDateLabel(TODAY, TODAY, 'de')).toBe('Heute');
    expect(utcDateLabel('2026-07-12', TODAY, 'de')).toBe('Morgen');
    expect(utcDateLabel(TODAY, TODAY, 'ja')).toBe('今日');
    expect(utcDateShortLabel('2026-07-12', TODAY, 'fr')).toBe('Demain');
  });

  it('localizes weekday/month names', () => {
    const de = utcDateLabel('2026-07-14', TODAY, 'de');
    expect(de).not.toContain('Jul 14');
    expect(de.length).toBeGreaterThan(0);
    expect(utcDateShortLabel('2026-07-14', TODAY, 'de')).not.toBe('Tue');
  });

  it('falls back to English for invalid tags', () => {
    expect(utcDateLabel('2026-07-14', TODAY, 'not a tag!')).toBe('Tue, Jul 14');
    expect(utcDateLabel(TODAY, TODAY, 'not a tag!')).toBe('Today');
  });
});

describe('utcDateAbsoluteLabel', () => {
  it('never goes relative, even for the reference day itself', () => {
    expect(utcDateAbsoluteLabel(TODAY)).toBe('Sat, Jul 11');
    expect(utcDateAbsoluteLabel('2026-07-12')).toBe('Sun, Jul 12');
  });

  it('localizes and falls back to English on invalid tags', () => {
    expect(utcDateAbsoluteLabel('2026-07-14', 'de')).not.toContain('Jul 14');
    expect(utcDateAbsoluteLabel('2026-07-14', 'not a tag!')).toBe('Tue, Jul 14');
  });
});

describe('localDateKey', () => {
  it('returns the runtime-local calendar date, not the UTC one', () => {
    // 22:13Z on Jul 29 is already Jul 30 in Berlin — the exact window in which
    // the day strip used to label the reader's own "today" as "Tomorrow".
    const instant = new Date('2026-07-29T22:13:00Z');
    const berlin = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
    }).format(instant);
    expect(berlin).toBe('2026-07-30');
    expect(instant.toISOString().slice(0, 10)).toBe('2026-07-29');
  });

  it('formats as YYYY-MM-DD', () => {
    expect(localDateKey(new Date('2026-07-11T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('relabels the day the viewer calls today', () => {
    // Server reference (UTC) says Jul 29; the viewer's local date is Jul 30.
    // Same day key, two references — this is what DayLabel swaps at hydration.
    expect(utcDateShortLabel('2026-07-30', '2026-07-29')).toBe('Tomorrow');
    expect(utcDateShortLabel('2026-07-30', '2026-07-30')).toBe('Today');
    // …and the day that WAS "Today" becomes an unambiguous date, not "Yesterday"
    // (the label helpers only special-case 0 and +1).
    expect(utcDateShortLabel('2026-07-29', '2026-07-30')).toBe('Wed');
  });
});

describe('formatUtcDateShort', () => {
  it('keeps the en default and localizes on request', () => {
    expect(formatUtcDateShort('2026-07-14T19:00:00Z')).toBe('Tue, Jul 14');
    expect(formatUtcDateShort('2026-07-14T19:00:00Z', 'de')).not.toBe('Tue, Jul 14');
  });
});

describe('localizedNextLabel (pre-existing multilingual helper)', () => {
  it('renders the absolute weekday form deterministically', () => {
    expect(
      localizedNextLabel('2026-07-18T19:00:00Z', 'en', { relative: false }),
    ).toBe('Sat 19:00 UTC');
    expect(
      localizedNextLabel('2026-07-18T19:00:00Z', 'de', { relative: false }),
    ).toContain('19:00 UTC');
  });
});

describe('localizedNextLabel — streamer-local timeZone option', () => {
  it('renders weekday + HH:MM in the zone without a UTC suffix', () => {
    expect(
      localizedNextLabel('2026-07-18T19:00:00Z', 'en', {
        relative: false,
        timeZone: 'Europe/Berlin',
      }),
    ).toBe('Sat 21:00'); // July → CEST = UTC+2
  });

  it('shifts the weekday across the zone midnight', () => {
    // Friday 23:30 UTC is already Saturday 01:30 in Berlin.
    expect(
      localizedNextLabel('2026-07-17T23:30:00Z', 'en', {
        relative: false,
        timeZone: 'Europe/Berlin',
      }),
    ).toBe('Sat 01:30');
  });

  it('handles half-hour offset zones', () => {
    // IST = UTC+5:30, and the +5:30 also flips the weekday here.
    expect(
      localizedNextLabel('2026-07-18T19:00:00Z', 'en', {
        relative: false,
        timeZone: 'Asia/Kolkata',
      }),
    ).toBe('Sun 00:30');
  });

  it('keeps the UTC form for UTC / invalid / absent zones', () => {
    const utcForm = 'Sat 19:00 UTC';
    expect(
      localizedNextLabel('2026-07-18T19:00:00Z', 'en', { relative: false, timeZone: 'UTC' }),
    ).toBe(utcForm);
    expect(
      localizedNextLabel('2026-07-18T19:00:00Z', 'en', {
        relative: false,
        timeZone: 'Mars/Olympus',
      }),
    ).toBe(utcForm);
  });

  it('judges today/tomorrow on the zone-local calendar date', () => {
    // now = 23:00 UTC on the 17th is already July 18 in Berlin → the 18th is
    // "today" there, while the plain UTC path would call it "tomorrow".
    expect(
      localizedNextLabel('2026-07-18T19:00:00Z', 'en', {
        timeZone: 'Europe/Berlin',
        now: new Date('2026-07-17T23:00:00Z'),
      }),
    ).toBe('Today 21:00');
  });
});

describe('safeTimeZone', () => {
  it('accepts real IANA ids and rejects UTC/null/garbage', () => {
    expect(safeTimeZone('Europe/Berlin')).toBe('Europe/Berlin');
    expect(safeTimeZone('America/New_York')).toBe('America/New_York');
    expect(safeTimeZone('UTC')).toBeNull();
    expect(safeTimeZone(null)).toBeNull();
    expect(safeTimeZone(undefined)).toBeNull();
    expect(safeTimeZone('')).toBeNull();
    expect(safeTimeZone('Mars/Olympus')).toBeNull();
  });
});

describe('formatDuration stays language-neutral', () => {
  it('uses symbolic h/m units', () => {
    expect(formatDuration(195)).toBe('3h 15m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(180)).toBe('3h');
  });
});

describe('absoluteStartLabel', () => {
  // 2026-07-18T19:00Z = Sat 21:00 in Berlin (CEST), Sat 15:00 in New York.
  const iso = '2026-07-18T19:00:00Z';

  it('carries the calendar date, unlike localizedNextLabel', () => {
    expect(localizedNextLabel(iso, 'en', { relative: false })).toBe('Sat 19:00 UTC');
    expect(absoluteStartLabel(iso, 'en')).toBe('Sat, Jul 18, 19:00');
  });

  it('renders in the given timezone', () => {
    expect(absoluteStartLabel(iso, 'en', 'Europe/Berlin')).toBe('Sat, Jul 18, 21:00');
    expect(absoluteStartLabel(iso, 'en', 'America/New_York')).toBe('Sat, Jul 18, 15:00');
  });

  it('localizes the date but keeps the 24h clock', () => {
    expect(absoluteStartLabel(iso, 'de', 'Europe/Berlin')).toBe('Sa., 18. Juli, 21:00');
  });

  it('falls back to UTC for an unusable zone', () => {
    expect(absoluteStartLabel(iso, 'en', 'Mars/Olympus')).toBe('Sat, Jul 18, 19:00');
  });

  it('falls back to en-US for a malformed language tag', () => {
    // Only MALFORMED tags reach the catch; an unknown-but-valid tag ('xx')
    // resolves to the host locale instead — same as localizedNextLabel and
    // weekdayLabel. Callers on this path always pass a validated UiLang.
    expect(absoluteStartLabel(iso, '')).toBe('Sat, Jul 18, 19:00');
  });

  it('returns an empty string for an unparseable timestamp', () => {
    expect(absoluteStartLabel('nope')).toBe('');
  });
});

describe('sevenDayKeys', () => {
  it('starts today and spans a week of UTC date keys', () => {
    const keys = sevenDayKeys(new Date('2026-07-30T23:00:00Z'));
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe('2026-07-30');
    expect(keys[6]).toBe('2026-08-05');
  });
});

describe('pickNextRealSlot', () => {
  const days = sevenDayKeys(new Date('2026-07-28T00:00:00Z'));
  const slot = (start: string, kind?: string) => ({
    start_time: start,
    ...(kind ? { slot_kind: kind } : {}),
  });

  it('takes the earliest upcoming slot regardless of input order', () => {
    const late = slot('2026-07-30T18:00:00Z');
    const early = slot('2026-07-29T18:00:00Z');
    expect(pickNextRealSlot([late, early], days)).toBe(early);
  });

  it('skips a cancelled slot — a cancellation is not a next stream', () => {
    const cancelled = slot('2026-07-29T18:00:00Z', 'cancelled');
    const real = slot('2026-07-30T18:00:00Z');
    expect(pickNextRealSlot([cancelled, real], days)).toBe(real);
  });

  it('skips slots past the last rendered day section', () => {
    // The fetch window reaches a day beyond the seven days that get a section.
    expect(pickNextRealSlot([slot('2026-08-04T18:00:00Z')], days)).toBeNull();
  });

  it('returns null when every upcoming slot is cancelled', () => {
    expect(pickNextRealSlot([slot('2026-07-29T18:00:00Z', 'cancelled')], days)).toBeNull();
  });

  it('treats a missing slot_kind as a regular stream (API deploy skew)', () => {
    const s = slot('2026-07-29T18:00:00Z');
    expect(pickNextRealSlot([s], days)).toBe(s);
  });
});
