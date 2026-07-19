import { describe, expect, it } from 'vitest';
import { nextStreamLabel, pickEarliestSlotPerStreamer } from '@/lib/next-stream';

describe('pickEarliestSlotPerStreamer', () => {
  it('returns an empty map for no slots', () => {
    expect(pickEarliestSlotPerStreamer([]).size).toBe(0);
  });

  it('keeps the earliest slot per streamer regardless of input order', () => {
    const slots = [
      { streamer_id: 'a', start_time: '2026-07-22T18:00:00Z' },
      { streamer_id: 'b', start_time: '2026-07-21T12:00:00Z' },
      { streamer_id: 'a', start_time: '2026-07-21T09:00:00Z' },
      { streamer_id: 'a', start_time: '2026-07-23T09:00:00Z' },
    ];
    const map = pickEarliestSlotPerStreamer(slots);
    expect(map.size).toBe(2);
    expect(map.get('a')?.start_time).toBe('2026-07-21T09:00:00Z');
    expect(map.get('b')?.start_time).toBe('2026-07-21T12:00:00Z');
  });
});

describe('nextStreamLabel', () => {
  // 2026-07-20 is a Monday.
  const now = new Date('2026-07-20T10:00:00Z');

  it('renders same-day starts as Today', () => {
    expect(nextStreamLabel('2026-07-20T20:00:00Z', { now, timeZone: 'UTC' })).toBe(
      'Today 8:00 PM',
    );
  });

  it('renders next-day starts as Tomorrow', () => {
    expect(nextStreamLabel('2026-07-21T09:30:00Z', { now, timeZone: 'UTC' })).toBe(
      'Tomorrow 9:30 AM',
    );
  });

  it('renders farther starts with the short weekday', () => {
    expect(nextStreamLabel('2026-07-23T19:00:00Z', { now, timeZone: 'UTC' })).toBe(
      'Thu 7:00 PM',
    );
  });

  it('judges day boundaries on the target zone calendar, not UTC', () => {
    // 22:30 UTC is 00:30 next day in Berlin (CEST, UTC+2).
    const lateNow = new Date('2026-07-20T21:30:00Z');
    expect(
      nextStreamLabel('2026-07-20T22:30:00Z', { now: lateNow, timeZone: 'Europe/Berlin' }),
    ).toBe('Tomorrow 12:30 AM');
    expect(
      nextStreamLabel('2026-07-20T22:30:00Z', { now: lateNow, timeZone: 'UTC' }),
    ).toBe('Today 10:30 PM');
  });

  it('returns an empty string for unparseable input', () => {
    expect(nextStreamLabel('not-a-date', { now, timeZone: 'UTC' })).toBe('');
  });
});
