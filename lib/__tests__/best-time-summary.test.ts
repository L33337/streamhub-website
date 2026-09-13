import { describe, expect, it } from 'vitest';
import type { GameTiming, TimingBestSlot } from '@/lib/server/partner-api';
import { buildBestTimeSummary } from '@/lib/game-timing';
import { formatStatValue } from '@/lib/format/number';

const fmt = (n: number) => formatStatValue(n, 'en');

const slot = (overrides: Partial<TimingBestSlot> = {}): TimingBestSlot => ({
  dow: 1,
  hour: 18,
  score: 42.4,
  viewers: 1234,
  streamers: 29.1,
  ...overrides,
});

const timing = (overrides: Partial<GameTiming> = {}): GameTiming => ({
  best_slots: [
    slot(),
    slot({ dow: 6, hour: 20, score: 38.2 }),
    slot({ dow: 0, hour: 9, score: 31 }),
  ],
  avg_viewers: 2000,
  avg_streamers: 100,
  ...overrides,
});

describe('buildBestTimeSummary', () => {
  it('states the top window in UTC with its absolute numbers', () => {
    const s = buildBestTimeSummary('Minecraft', timing(), fmt);
    expect(s?.lead).toBe(
      'The strongest window for Minecraft is Tuesday at 18:00 UTC: about 1.2K viewers across 29 live channels, or 42 viewers per channel.',
    );
  });

  it('lists the runners-up in API order', () => {
    const s = buildBestTimeSummary('Minecraft', timing(), fmt);
    expect(s?.runnersUp).toBe(
      'The next best windows are Sunday at 20:00 UTC (38 viewers per channel) and Monday at 09:00 UTC (31 viewers per channel).',
    );
  });

  it('uses the singular for one runner-up and for one channel', () => {
    const s = buildBestTimeSummary(
      'Chess',
      timing({ best_slots: [slot({ streamers: 1 }), slot({ dow: 2, score: 5 })] }),
      fmt,
    );
    expect(s?.lead).toContain('across 1 live channel,');
    expect(s?.runnersUp).toBe('The next best window is Wednesday at 18:00 UTC (5 viewers per channel).');
  });

  it('calls out a standout window against the weekly average', () => {
    // avg = 2000 / 100 = 20 viewers per channel; 42.4 / 20 = 2.1x
    expect(buildBestTimeSummary('Minecraft', timing(), fmt)?.average).toBe(
      'That is 2.1 times the weekly average of 20 viewers per channel, so a stream in that hour competes with fewer channels for each viewer.',
    );
  });

  it('says so when no hour stands out', () => {
    const s = buildBestTimeSummary('Chess', timing({ avg_viewers: 4000, avg_streamers: 100 }), fmt);
    expect(s?.average).toContain('close to the weekly average of 40 viewers per channel');
  });

  it('omits the average sentence without usable averages', () => {
    expect(buildBestTimeSummary('X', timing({ avg_viewers: null }), fmt)?.average).toBeNull();
    expect(buildBestTimeSummary('X', timing({ avg_streamers: 0 }), fmt)?.average).toBeNull();
  });

  it('skips malformed slots instead of printing them', () => {
    const s = buildBestTimeSummary(
      'X',
      timing({ best_slots: [slot({ dow: 9 }), slot({ streamers: 0 }), slot({ hour: 7 })] }),
      fmt,
    );
    expect(s?.lead).toContain('Tuesday at 07:00 UTC');
    expect(s?.runnersUp).toBeNull();
  });

  it('returns null without a statable slot', () => {
    expect(buildBestTimeSummary('X', null, fmt)).toBeNull();
    expect(buildBestTimeSummary('X', timing({ best_slots: [] }), fmt)).toBeNull();
    expect(buildBestTimeSummary('X', timing({ best_slots: null }), fmt)).toBeNull();
  });

  it('never uses em or en dashes (house style)', () => {
    for (const t of [timing(), timing({ avg_viewers: 4000 })]) {
      const s = buildBestTimeSummary('Counter-Strike', t, fmt);
      for (const text of [s?.lead, s?.runnersUp, s?.average]) {
        expect(text ?? '').not.toMatch(/[—–]/);
      }
    }
  });
});
