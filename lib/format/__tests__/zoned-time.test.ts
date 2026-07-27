import { describe, it, expect } from 'vitest';
import {
  isoWeekdayInZone,
  toViewerWeekdayTime,
  zonedWallClockToUtc,
} from '../zoned-time';

// 2026-07-11 is a Saturday, so the next Monday is 2026-07-13. Summer: Berlin is
// UTC+2 (CEST), New York UTC-4 (EDT) — six hours apart.
const NOW = new Date('2026-07-11T12:00:00Z');
const opts = (viewerZone: string) => ({ now: NOW, viewerZone });

describe('zonedWallClockToUtc', () => {
  it('resolves a summer wall clock through the zone offset', () => {
    expect(
      zonedWallClockToUtc(2026, 7, 13, 19, 0, 'Europe/Berlin').toISOString(),
    ).toBe('2026-07-13T17:00:00.000Z');
  });

  it('uses the winter offset for a winter date (not a fixed offset)', () => {
    expect(
      zonedWallClockToUtc(2026, 1, 13, 19, 0, 'Europe/Berlin').toISOString(),
    ).toBe('2026-01-13T18:00:00.000Z');
  });
});

describe('isoWeekdayInZone', () => {
  it('reads the weekday in the given zone, not UTC', () => {
    // 22:30 UTC on Sunday is already Monday in Tokyo.
    const d = new Date('2026-07-12T22:30:00Z');
    expect(isoWeekdayInZone(d, 'UTC')).toBe(6); // Sunday
    expect(isoWeekdayInZone(d, 'Asia/Tokyo')).toBe(0); // Monday
  });
});

describe('toViewerWeekdayTime', () => {
  it('converts an evening slot without changing the weekday', () => {
    expect(
      toViewerWeekdayTime('19:00', 0, 'Europe/Berlin', 'en', opts('America/New_York')),
    ).toEqual({ time: '1:00 PM', shiftedWeekday: null });
  });

  it('reports the shifted weekday when the time crosses midnight backwards', () => {
    // Monday 01:00 in Berlin is still Sunday evening in New York — without the
    // shift flag the "Monday" row would state a time that is not on a Monday.
    expect(
      toViewerWeekdayTime('01:00', 0, 'Europe/Berlin', 'en', opts('America/New_York')),
    ).toEqual({ time: '7:00 PM', shiftedWeekday: 6 });
  });

  it('reports a forward shift too', () => {
    // Sunday 22:00 in New York is Monday in Berlin.
    expect(
      toViewerWeekdayTime('22:00', 6, 'America/New_York', 'en', opts('Europe/Berlin')),
    ).toEqual({ time: '4:00 AM', shiftedWeekday: 0 });
  });

  it('renders the viewer locale hour cycle', () => {
    expect(
      toViewerWeekdayTime('19:00', 0, 'Europe/Berlin', 'de', opts('Europe/Berlin'))?.time,
    ).toBe('19:00');
  });

  it('is a no-op when viewer and streamer share a zone', () => {
    expect(
      toViewerWeekdayTime('19:00', 2, 'Europe/Berlin', 'en', opts('Europe/Berlin')),
    ).toEqual({ time: '7:00 PM', shiftedWeekday: null });
  });

  it('returns null for unusable input instead of guessing', () => {
    expect(toViewerWeekdayTime('', 0, 'Europe/Berlin', 'en', opts('UTC'))).toBeNull();
    expect(toViewerWeekdayTime('9pm', 0, 'Europe/Berlin', 'en', opts('UTC'))).toBeNull();
    expect(toViewerWeekdayTime('25:00', 0, 'Europe/Berlin', 'en', opts('UTC'))).toBeNull();
    expect(toViewerWeekdayTime('19:00', 0, 'Not/AZone', 'en', opts('UTC'))).toBeNull();
  });
});
