import { describe, expect, it } from 'vitest';
import { heroActivity, QUIET_MIN_DAYS } from '../hero-activity';

const now = new Date('2026-09-24T12:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe('heroActivity', () => {
  it('an announced break with a future end wins over everything', () => {
    expect(
      heroActivity({
        lastStreamAt: daysAgo(20),
        vacationUntil: '2026-10-05T00:00:00Z',
        streamsPerWeek: 5,
        now,
      }),
    ).toEqual({ kind: 'break', until: '2026-10-05T00:00:00.000Z' });
  });

  it('a past vacation end is ignored', () => {
    expect(
      heroActivity({ lastStreamAt: daysAgo(1), vacationUntil: daysAgo(2), streamsPerWeek: 5, now }),
    ).toEqual({ kind: 'recent', lastStreamAt: daysAgo(1) });
  });

  it('quiet only beyond the streamer\'s own rhythm (kaicenat: ~2 streams/week, 9 days silent)', () => {
    // 1.8/week → typical gap 3.9 d → threshold max(7, 9.7) = 9.7 d
    expect(heroActivity({ lastStreamAt: daysAgo(9), vacationUntil: null, streamsPerWeek: 1.8, now })?.kind).toBe(
      'recent',
    );
    expect(heroActivity({ lastStreamAt: daysAgo(11), vacationUntil: null, streamsPerWeek: 1.8, now })?.kind).toBe(
      'quiet',
    );
  });

  it('a daily streamer is quiet after a week, never earlier', () => {
    expect(heroActivity({ lastStreamAt: daysAgo(QUIET_MIN_DAYS - 0.5), vacationUntil: null, streamsPerWeek: 7, now })?.kind).toBe(
      'recent',
    );
    expect(heroActivity({ lastStreamAt: daysAgo(QUIET_MIN_DAYS + 0.5), vacationUntil: null, streamsPerWeek: 7, now })?.kind).toBe(
      'quiet',
    );
  });

  it('unknown rhythm falls back to a weekly gap', () => {
    // threshold max(7, 2.5 × 7) = 17.5 d
    expect(heroActivity({ lastStreamAt: daysAgo(17), vacationUntil: null, streamsPerWeek: null, now })?.kind).toBe('recent');
    expect(heroActivity({ lastStreamAt: daysAgo(18), vacationUntil: undefined, streamsPerWeek: 0, now })?.kind).toBe('quiet');
  });

  it('nothing to say without a (sane) last stream', () => {
    expect(heroActivity({ lastStreamAt: null, vacationUntil: null, streamsPerWeek: 3, now })).toBeNull();
    expect(heroActivity({ lastStreamAt: undefined, vacationUntil: null, streamsPerWeek: 3, now })).toBeNull();
    expect(heroActivity({ lastStreamAt: 'garbage', vacationUntil: null, streamsPerWeek: 3, now })).toBeNull();
    expect(heroActivity({ lastStreamAt: '2026-09-30T00:00:00Z', vacationUntil: null, streamsPerWeek: 3, now })).toBeNull();
  });
});
