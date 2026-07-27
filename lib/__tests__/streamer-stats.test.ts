import { describe, it, expect } from 'vitest';
import type { PublicStreamerStats } from '../server/partner-api';
import {
  activeWeekdayList,
  statsLeadSentence,
  statsTimezoneLabel,
} from '../streamer-stats';

function makeStats(overrides: Partial<PublicStreamerStats> = {}): PublicStreamerStats {
  return {
    streamer_id: 'testy',
    has_stats: true,
    window_days: 28,
    sample_size: 23,
    source: 'vod',
    timezone: 'Europe/Berlin',
    typical_start: '20:00',
    typical_end: '23:30',
    typical_duration_minutes: 195,
    streams_per_week: 5.5,
    active_days_per_week: 5,
    hours_streamed: 88.5,
    peak_viewer_count: 12345,
    weekdays: [],
    top_categories: [],
    ...overrides,
  };
}

describe('statsTimezoneLabel', () => {
  it('keeps UTC literal in every language', () => {
    const utc = makeStats({ timezone: 'UTC' });
    expect(statsTimezoneLabel(utc)).toBe('UTC');
    expect(statsTimezoneLabel(utc, 'de')).toBe('UTC');
    expect(statsTimezoneLabel(utc, 'ja')).toBe('UTC');
  });

  it('renders the legacy English city label by default', () => {
    expect(statsTimezoneLabel(makeStats())).toBe('Berlin time');
    expect(statsTimezoneLabel(makeStats({ timezone: 'America/New_York' }))).toBe(
      'New York time',
    );
  });

  it('localizes the city label', () => {
    expect(statsTimezoneLabel(makeStats(), 'de')).toContain('Berlin');
    expect(statsTimezoneLabel(makeStats(), 'de')).not.toBe('Berlin time');
  });
});

describe('statsLeadSentence', () => {
  it('reproduces the legacy English sentence byte-identically', () => {
    expect(statsLeadSentence('Testy', makeStats())).toBe(
      'Testy usually streams 5 days per week, typically between 20:00 and 23:30 (Berlin time).',
    );
    expect(
      statsLeadSentence('Testy', makeStats({ typical_start: null, typical_end: null })),
    ).toBe('Testy usually streams 5 days per week.');
    expect(
      statsLeadSentence(
        'Testy',
        makeStats({ active_days_per_week: 1, typical_start: null, typical_end: null }),
      ),
    ).toBe('Testy usually streams 1 day per week.');
  });

  it('clamps active days to at least 1 and rounds', () => {
    expect(
      statsLeadSentence(
        'Testy',
        makeStats({ active_days_per_week: 0.3, typical_start: null, typical_end: null }),
      ),
    ).toBe('Testy usually streams 1 day per week.');
  });

  it('applies Russian day plurals', () => {
    const one = statsLeadSentence(
      'Testy',
      makeStats({ active_days_per_week: 1, typical_start: null, typical_end: null }),
      'ru',
    );
    const few = statsLeadSentence(
      'Testy',
      makeStats({ active_days_per_week: 2, typical_start: null, typical_end: null }),
      'ru',
    );
    const many = statsLeadSentence(
      'Testy',
      makeStats({ active_days_per_week: 5, typical_start: null, typical_end: null }),
      'ru',
    );
    expect(one).toContain('1 день');
    expect(few).toContain('2 дня');
    expect(many).toContain('5 дней');
  });

  it('localizes the German sentence with times', () => {
    const de = statsLeadSentence('Testy', makeStats(), 'de');
    expect(de).toContain('Testy');
    expect(de).toContain('20:00');
    expect(de).toContain('23:30');
    expect(de).not.toContain('usually streams');
  });
});

describe('activeWeekdayList', () => {
  const weekday = (w: string) => ({
    weekday: w,
    start: '20:00',
    end: '23:30',
    duration_minutes: 210,
  });
  const withDays = (...w: string[]) =>
    makeStats({
      weekdays: w.map(weekday) as PublicStreamerStats['weekdays'],
    });

  it('lists the streamed days in ISO order, not input order', () => {
    expect(activeWeekdayList(withDays('saturday', 'tuesday', 'thursday'))).toBe(
      'Tue, Thu, Sat',
    );
  });

  it('starts the week on Monday and ends it on Sunday', () => {
    expect(activeWeekdayList(withDays('sunday', 'monday'))).toBe('Mon, Sun');
  });

  it('localizes the day names', () => {
    expect(activeWeekdayList(withDays('tuesday', 'thursday'), 'de')).toBe('Di, Do');
  });

  it('returns null without weekday rows, so callers can fall back', () => {
    expect(activeWeekdayList(makeStats())).toBeNull();
  });
});
