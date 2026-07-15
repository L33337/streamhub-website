import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatUtcDateShort,
  localizedNextLabel,
  safeTimeZone,
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
