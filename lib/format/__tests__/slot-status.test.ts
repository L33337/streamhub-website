import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { getRelativeTime, getStatusText } from '../slot-status';

const NOW = new Date('2026-07-11T12:00:00Z');

function makeSlot(overrides: Partial<PublicStreamSlot> = {}): PublicStreamSlot {
  return {
    id: 'slot-1',
    streamer_id: 'testy',
    streamer_name: 'Testy',
    platforms: ['twitch'],
    title: 'A stream',
    category: null,
    thumbnail_url: null,
    avatar_url: null,
    start_time: '2026-07-12T21:00:00Z',
    duration_minutes: 120,
    status: 'upcoming',
    is_predicted: false,
    confidence: 'high',
    is_always_on: false,
    twitch_login: 'testy',
    youtube_channel_id: null,
    streamer_timezone: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getStatusText — English default (bleed guard, byte-identical legacy output)', () => {
  it('live slot', () => {
    const slot = makeSlot({
      status: 'live',
      start_time: '2026-07-11T10:00:00Z', // live for 2 hours
      duration_minutes: 240, // ends in 2 hours
    });
    expect(getStatusText(slot, true)).toBe('Live since 2 hours · Ends in ~2h');
  });

  it('always-on live slot', () => {
    const slot = makeSlot({
      status: 'live',
      is_always_on: true,
      start_time: '2026-07-11T10:00:00Z',
    });
    expect(getStatusText(slot, true)).toBe('Live since 2 hours');
  });

  it('upcoming slot without streamer timezone (server snapshot)', () => {
    // 21:00 UTC → "9pm UTC"; unknown streamer tz collapses the redundant suffix.
    expect(getStatusText(makeSlot(), true)).toMatch(/^\w{3}, Jul 12 · Around 9pm UTC$/);
  });

  it('upcoming slot with streamer timezone appends the zone hour', () => {
    const slot = makeSlot({ streamer_timezone: 'Europe/Berlin' });
    // 21:00 UTC in July = 23:00 CEST → "11pm CEST".
    expect(getStatusText(slot, true)).toMatch(
      /^\w{3}, Jul 12 · Around 9pm UTC · 11pm CEST$/,
    );
  });

  it('overdue predicted slot', () => {
    const slot = makeSlot({
      is_predicted: true,
      start_time: '2026-07-11T10:00:00Z', // 2h in the past, still "upcoming"
    });
    expect(getStatusText(slot, true)).toBe('Was expected around 10am UTC');
  });

  it('offline slot', () => {
    expect(getStatusText(makeSlot({ status: 'offline' }), true)).toBe('Offline');
  });

  it('cancelled slot never phrases as upcoming', () => {
    const slot = makeSlot({ is_predicted: true, slot_kind: 'cancelled' });
    expect(getStatusText(slot, true)).toBe('No stream expected (usually around 9pm UTC)');
  });

  it('cancelled beats the overdue "was expected" branch', () => {
    const slot = makeSlot({
      is_predicted: true,
      slot_kind: 'cancelled',
      start_time: '2026-07-11T10:00:00Z', // start already passed
    });
    expect(getStatusText(slot, true)).toBe('No stream expected (usually around 10am UTC)');
  });

  it('cancelled slot with streamer timezone appends the zone hour', () => {
    const slot = makeSlot({
      is_predicted: true,
      slot_kind: 'cancelled',
      streamer_timezone: 'Europe/Berlin',
    });
    expect(getStatusText(slot, true)).toBe(
      'No stream expected (usually around 9pm UTC · 11pm CEST)',
    );
  });
});

describe('getStatusText — localized', () => {
  it('German upcoming uses 24h clock and no "your time"', () => {
    const slot = makeSlot({ streamer_timezone: 'Europe/Berlin' });
    const text = getStatusText(slot, true, 'de');
    expect(text).toContain('21:00 UTC');
    expect(text).toContain('CEST');
    expect(text).not.toContain('your time');
    expect(text).not.toContain('Around');
  });

  it('German live slot localizes the duration', () => {
    const slot = makeSlot({
      status: 'live',
      start_time: '2026-07-11T10:00:00Z',
      duration_minutes: 240,
    });
    const text = getStatusText(slot, true, 'de');
    expect(text).toContain('2 Stunden');
    expect(text).toContain('~2h');
    expect(text).not.toContain('Live since');
  });

  it('Japanese and Russian offline states are localized', () => {
    expect(getStatusText(makeSlot({ status: 'offline' }), true, 'ja')).toBe('オフライン');
    expect(getStatusText(makeSlot({ status: 'offline' }), true, 'ru')).toBe('Не в эфире');
  });

  it('unknown language tags fall back to English', () => {
    expect(getStatusText(makeSlot({ status: 'offline' }), true, 'other')).toBe('Offline');
  });

  it('cancelled status is localized (de/ja) and every language provides it', () => {
    const slot = makeSlot({ is_predicted: true, slot_kind: 'cancelled' });
    expect(getStatusText(slot, true, 'de')).toBe(
      'Kein Stream erwartet (sonst meist gegen 21:00 UTC)',
    );
    expect(getStatusText(slot, true, 'ja')).toContain('配信予定なし');
  });
});

describe('getRelativeTime', () => {
  it('keeps the legacy English forms', () => {
    expect(getRelativeTime(new Date('2026-07-11T10:00:00Z'))).toBe('2 hours');
    expect(getRelativeTime(new Date('2026-07-11T11:59:00Z'))).toBe('1 minute');
    expect(getRelativeTime(new Date('2026-07-11T11:15:00Z'))).toBe('45 minutes');
  });

  it('localizes with correct plural inflection', () => {
    expect(getRelativeTime(new Date('2026-07-11T10:00:00Z'), 'ru')).toBe('2 часа');
    expect(getRelativeTime(new Date('2026-07-11T07:00:00Z'), 'ru')).toBe('5 часов');
    expect(getRelativeTime(new Date('2026-07-11T10:00:00Z'), 'de')).toBe('2 Stunden');
  });
});
