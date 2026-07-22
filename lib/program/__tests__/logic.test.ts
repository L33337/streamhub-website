import { describe, it, expect } from 'vitest';
import {
  getHourLabel,
  getEndTime,
  isSameLocalDay,
  formatLocalTimeRange,
  formatDateChipLabel,
  filterSlotsByDate,
  computeMissedSlots,
  groupUpcomingByHour,
  deriveOfflineFavorites,
  buildProgramDay,
  isViewerCountFresh,
  findScrollTargetSection,
  toProgramPublicSlot,
} from '../logic';
import type { StreamSlot } from '@/lib/feed/types';
import type { FavoriteStreamerRow } from '@/lib/supabase/favorites';

// All dates use the LOCAL Date constructor on purpose — the Program pipeline
// groups in the viewer's local timezone, so local-constructed fixtures make
// every assertion timezone-agnostic (feed logic.test.ts convention).
const NOW = new Date(2026, 6, 7, 12, 0); // Tue Jul 7 2026, 12:00 local
const TODAY = new Date(2026, 6, 7);
const TOMORROW = new Date(2026, 6, 8);

function iso(y: number, m: number, d: number, h: number, min = 0): string {
  return new Date(y, m, d, h, min).toISOString();
}

function slot(overrides: Partial<StreamSlot>): StreamSlot {
  return {
    id: 'slot-1',
    streamerId: 'streamer-1',
    streamerName: 'Streamer One',
    platforms: ['twitch'],
    streamTitle: 'Test stream',
    startTime: iso(2026, 6, 7, 16),
    duration: 120,
    status: 'upcoming',
    confidence: 'high',
    isAiPrediction: false,
    visible: true,
    slotKind: 'regular',
    isUncertain: false,
    isAlwaysOn: false,
    ...overrides,
  };
}

function favorite(overrides: Partial<FavoriteStreamerRow>): FavoriteStreamerRow {
  return {
    id: 'streamer-1',
    name: 'Streamer One',
    platforms: ['twitch'],
    avatar_url: null,
    is_featured: false,
    is_always_on: false,
    favorited_at: NOW.toISOString(),
    ...overrides,
  };
}

describe('getHourLabel', () => {
  it('formats midnight, noon, am and pm hours', () => {
    expect(getHourLabel(0)).toBe('12am');
    expect(getHourLabel(12)).toBe('12pm');
    expect(getHourLabel(9)).toBe('9am');
    expect(getHourLabel(16)).toBe('4pm');
    expect(getHourLabel(23)).toBe('11pm');
  });
});

describe('getEndTime / isSameLocalDay', () => {
  it('computes end = start + duration', () => {
    const end = getEndTime(iso(2026, 6, 7, 20), 90);
    expect(end.getTime()).toBe(new Date(2026, 6, 7, 21, 30).getTime());
  });

  it('compares local calendar days', () => {
    expect(isSameLocalDay(new Date(2026, 6, 7, 0, 1), new Date(2026, 6, 7, 23, 59))).toBe(true);
    expect(isSameLocalDay(new Date(2026, 6, 7, 23, 59), new Date(2026, 6, 8, 0, 1))).toBe(false);
  });
});

describe('formatDateChipLabel', () => {
  it("returns 'today' when the selected date is today", () => {
    expect(formatDateChipLabel(new Date(2026, 6, 7, 8), NOW)).toBe('today');
  });

  it('returns a short date otherwise', () => {
    expect(formatDateChipLabel(new Date(2026, 6, 9), NOW)).toBe('Jul 9');
  });
});

describe('formatLocalTimeRange', () => {
  it('renders a local start–end range', () => {
    const text = formatLocalTimeRange(iso(2026, 6, 7, 20), 120);
    expect(text).toContain('8:00');
    expect(text).toContain('10:00');
    expect(text).toContain('–');
  });
});

describe('filterSlotsByDate', () => {
  it('keeps slots on the selected local day', () => {
    const s = slot({ startTime: iso(2026, 6, 7, 15) });
    expect(filterSlotsByDate([s], TODAY, NOW)).toHaveLength(1);
  });

  it('drops slots on other days', () => {
    const s = slot({ startTime: iso(2026, 6, 8, 15) });
    expect(filterSlotsByDate([s], TODAY, NOW)).toHaveLength(0);
  });

  it('keeps previous-day slots from 21:00, drops 20:59', () => {
    const late = slot({ id: 'late', startTime: iso(2026, 6, 6, 21) });
    const early = slot({ id: 'early', startTime: iso(2026, 6, 6, 20, 59) });
    const kept = filterSlotsByDate([late, early], TODAY, NOW);
    expect(kept.map((s) => s.id)).toEqual(['late']);
  });

  it('shows always-on live slots on every date', () => {
    const s = slot({ status: 'live', isAlwaysOn: true, startTime: iso(2026, 6, 1, 10) });
    expect(filterSlotsByDate([s], TOMORROW, NOW)).toHaveLength(1);
  });

  it('shows regular live slots only when viewing today', () => {
    const s = slot({ status: 'live', startTime: iso(2026, 6, 7, 11) });
    expect(filterSlotsByDate([s], TODAY, NOW)).toHaveLength(1);
    expect(filterSlotsByDate([s], TOMORROW, NOW)).toHaveLength(0);
  });
});

describe('computeMissedSlots', () => {
  it('keeps a real slot that ended within the last 6 hours', () => {
    // 08:00–10:00, ended 2h before NOW (12:00)
    const s = slot({ startTime: iso(2026, 6, 7, 8), duration: 120 });
    expect(computeMissedSlots([s], TODAY, NOW)).toHaveLength(1);
  });

  it('drops a slot that ended more than 6 hours ago', () => {
    // 03:00–05:59, ended 6h01m before NOW
    const s = slot({ startTime: iso(2026, 6, 7, 3), duration: 179 });
    expect(computeMissedSlots([s], TODAY, NOW)).toHaveLength(0);
  });

  it('keeps a slot that ended exactly 5h59m ago', () => {
    const s = slot({ startTime: iso(2026, 6, 7, 3), duration: 181 });
    expect(computeMissedSlots([s], TODAY, NOW)).toHaveLength(1);
  });

  it('excludes AI predictions', () => {
    const s = slot({ startTime: iso(2026, 6, 7, 8), duration: 120, isAiPrediction: true });
    expect(computeMissedSlots([s], TODAY, NOW)).toHaveLength(0);
  });

  it('returns [] when not viewing today', () => {
    const s = slot({ startTime: iso(2026, 6, 7, 8), duration: 120 });
    expect(computeMissedSlots([s], TOMORROW, NOW)).toHaveLength(0);
  });

  it('includes an overnight stream that started yesterday', () => {
    // 23:00 yesterday – 01:00 today: ended 11h ago? No — NOW is 12:00, ended
    // 01:00 = 11h ago → outside. Use one ending 07:00 (5h ago).
    const s = slot({ startTime: iso(2026, 6, 6, 23), duration: 8 * 60 });
    expect(computeMissedSlots([s], TODAY, NOW)).toHaveLength(1);
  });

  it('sorts by start time', () => {
    const a = slot({ id: 'a', startTime: iso(2026, 6, 7, 9), duration: 60 });
    const b = slot({ id: 'b', startTime: iso(2026, 6, 7, 7), duration: 60 });
    expect(computeMissedSlots([a, b], TODAY, NOW).map((s) => s.id)).toEqual(['b', 'a']);
  });
});

describe('groupUpcomingByHour', () => {
  it('groups by local start hour ascending with hour labels', () => {
    const sections = groupUpcomingByHour([
      slot({ id: 'a', startTime: iso(2026, 6, 7, 20) }),
      slot({ id: 'b', streamerId: 's2', startTime: iso(2026, 6, 7, 16) }),
      slot({ id: 'c', streamerId: 's3', startTime: iso(2026, 6, 7, 16, 30) }),
    ]);
    expect(sections.map((s) => s.id)).toEqual(['hour-16', 'hour-20']);
    expect(sections[0].title).toBe('4pm');
    expect(sections[0].slots.map((s) => s.id)).toEqual(['b', 'c']);
    expect(sections[1].title).toBe('8pm');
  });
});

describe('deriveOfflineFavorites', () => {
  it('includes favorites with no slot today', () => {
    const favs = [favorite({ id: 'idle' }), favorite({ id: 'busy' })];
    const slots = [slot({ streamerId: 'busy', startTime: iso(2026, 6, 7, 20) })];
    const offline = deriveOfflineFavorites(favs, slots, new Set(), NOW);
    expect(offline.map((f) => f.id)).toEqual(['idle']);
  });

  it('a slot on another day does not count as streaming today', () => {
    const favs = [favorite({ id: 'a' })];
    const slots = [slot({ streamerId: 'a', startTime: iso(2026, 6, 8, 20) })];
    expect(deriveOfflineFavorites(favs, slots, new Set(), NOW)).toHaveLength(1);
  });

  it('excludes streamers already visible via activeStreamerIds', () => {
    const favs = [favorite({ id: 'always-on' })];
    expect(
      deriveOfflineFavorites(favs, [], new Set(['always-on']), NOW),
    ).toHaveLength(0);
  });
});

describe('buildProgramDay', () => {
  it('puts the live section first, then hour groups', () => {
    const day = buildProgramDay(
      [
        slot({ id: 'up', streamerId: 's1', startTime: iso(2026, 6, 7, 20) }),
        slot({ id: 'live', streamerId: 's2', status: 'live', startTime: iso(2026, 6, 7, 11) }),
      ],
      [],
      TODAY,
      NOW,
    );
    expect(day.sections.map((s) => s.id)).toEqual(['live', 'hour-20']);
    expect(day.sections[0].title).toBe('Live Now');
  });

  it('KEEPS cancelled slots (unlike the feed Up Next exclusion)', () => {
    const day = buildProgramDay(
      [slot({ slotKind: 'cancelled', isAiPrediction: true, startTime: iso(2026, 6, 7, 20) })],
      [],
      TODAY,
      NOW,
    );
    expect(day.sections).toHaveLength(1);
    expect(day.sections[0].slots[0].slotKind).toBe('cancelled');
  });

  it('dedupes overlapping real + AI slots (real wins)', () => {
    const day = buildProgramDay(
      [
        slot({ id: 'ai', isAiPrediction: true, startTime: iso(2026, 6, 7, 20) }),
        slot({ id: 'real', startTime: iso(2026, 6, 7, 20, 30) }),
      ],
      [],
      TODAY,
      NOW,
    );
    const ids = day.sections.flatMap((s) => s.slots.map((x) => x.id));
    expect(ids).toEqual(['real']);
  });

  it('collects missed slots and offline favorites', () => {
    const favs = [favorite({ id: 'idle' }), favorite({ id: 'streamer-1' })];
    const day = buildProgramDay(
      [slot({ startTime: iso(2026, 6, 7, 8), duration: 120 })], // ended 10:00
      favs,
      TODAY,
      NOW,
    );
    expect(day.missedSlots).toHaveLength(1);
    // streamer-1 streamed today (missed) → only 'idle' is offline
    expect(day.offlineFavorites.map((f) => f.id)).toEqual(['idle']);
  });

  it('recomputes stale live status (past real slot ends up offline, not live)', () => {
    const day = buildProgramDay(
      // DB says 'upcoming' but the window has passed → offline → missed
      [slot({ startTime: iso(2026, 6, 7, 9), duration: 60 })],
      [],
      TODAY,
      NOW,
    );
    expect(day.sections).toHaveLength(0);
    expect(day.missedSlots).toHaveLength(1);
  });
});

describe('isViewerCountFresh', () => {
  const base = {
    status: 'live' as const,
    viewerCount: 1500,
    viewerCountUpdatedAt: new Date(NOW.getTime() - 24 * 60 * 1000).toISOString(),
  };

  it('fresh: live slot with a 24-min-old sample', () => {
    expect(isViewerCountFresh(slot(base), NOW)).toBe(true);
  });

  it('stale: 26-min-old sample', () => {
    expect(
      isViewerCountFresh(
        slot({
          ...base,
          viewerCountUpdatedAt: new Date(NOW.getTime() - 26 * 60 * 1000).toISOString(),
        }),
        NOW,
      ),
    ).toBe(false);
  });

  it('not live → never fresh', () => {
    expect(
      isViewerCountFresh(slot({ ...base, status: 'upcoming', startTime: iso(2026, 6, 7, 20) }), NOW),
    ).toBe(false);
  });

  it('zero or missing count → not fresh', () => {
    expect(isViewerCountFresh(slot({ ...base, viewerCount: 0 }), NOW)).toBe(false);
    expect(isViewerCountFresh(slot({ ...base, viewerCount: undefined }), NOW)).toBe(false);
  });
});

describe('toProgramPublicSlot', () => {
  it('passes a fresh viewer count through', () => {
    const s = slot({
      status: 'live',
      viewerCount: 1500,
      viewerCountUpdatedAt: new Date(NOW.getTime() - 60 * 1000).toISOString(),
    });
    expect(toProgramPublicSlot(s, NOW).viewer_count).toBe(1500);
  });

  it('nulls a stale viewer count', () => {
    const s = slot({
      status: 'live',
      viewerCount: 1500,
      viewerCountUpdatedAt: new Date(NOW.getTime() - 30 * 60 * 1000).toISOString(),
    });
    expect(toProgramPublicSlot(s, NOW).viewer_count).toBeNull();
  });
});

describe('findScrollTargetSection', () => {
  const sections = [
    { id: 'live', title: 'Live Now', type: 'live' as const, hour: null, slots: [] },
    { id: 'hour-14', title: '2pm', type: 'upcoming' as const, hour: 14, slots: [] },
    { id: 'hour-20', title: '8pm', type: 'upcoming' as const, hour: 20, slots: [] },
  ];

  it('finds the exact or next-later hour section', () => {
    expect(findScrollTargetSection(sections, 14)).toBe('hour-14');
    expect(findScrollTargetSection(sections, 16)).toBe('hour-20');
  });

  it('falls back to the last upcoming section when the target is later than all', () => {
    expect(findScrollTargetSection(sections, 22)).toBe('hour-20');
  });

  it('returns null with no upcoming sections', () => {
    expect(findScrollTargetSection([sections[0]], 16)).toBeNull();
  });
});
