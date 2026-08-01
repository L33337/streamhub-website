import { describe, expect, it } from 'vitest';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  capDaySlots,
  isIcsExportable,
  MAX_SLOTS_PER_DAY,
  publicSlotToIcsSlot,
  schedulePlatforms,
  splitCollapsibleSlots,
} from '@/lib/game-schedule';

function slot(overrides: Partial<PublicStreamSlot> = {}): PublicStreamSlot {
  return {
    id: 'slot-1',
    streamer_id: 'streamer1',
    streamer_name: 'Streamer One',
    platforms: ['twitch'],
    title: 'Ranked grind',
    category: 'VALORANT',
    thumbnail_url: null,
    avatar_url: null,
    start_time: '2026-07-24T18:00:00Z',
    duration_minutes: 180,
    status: 'upcoming',
    is_predicted: true,
    confidence: 'low',
    slot_kind: 'regular',
    is_always_on: false,
    viewer_count: null,
    streamer_timezone: null,
    ...overrides,
  } as PublicStreamSlot;
}

describe('splitCollapsibleSlots', () => {
  it('collapses only low-confidence upcoming predictions', () => {
    const low = slot({ id: 'a', confidence: 'low' });
    const medium = slot({ id: 'b', confidence: 'medium' });
    const high = slot({ id: 'c', confidence: 'high' });
    const { full, low: collapsed } = splitCollapsibleSlots([low, medium, high]);
    expect(collapsed.map((s) => s.id)).toEqual(['a']);
    expect(full.map((s) => s.id)).toEqual(['b', 'c']);
  });

  it('keeps cancelled slots as full cards even at low confidence', () => {
    const cancelled = slot({ id: 'a', confidence: 'low', slot_kind: 'cancelled' });
    const { full, low } = splitCollapsibleSlots([cancelled]);
    expect(full).toHaveLength(1);
    expect(low).toHaveLength(0);
  });

  it('keeps live slots as full cards regardless of confidence', () => {
    const live = slot({ id: 'a', confidence: 'low', status: 'live' });
    const { full, low } = splitCollapsibleSlots([live]);
    expect(full).toHaveLength(1);
    expect(low).toHaveLength(0);
  });

  it('preserves input order within each bucket', () => {
    const slots = [
      slot({ id: 'a', confidence: 'high' }),
      slot({ id: 'b', confidence: 'low' }),
      slot({ id: 'c', confidence: 'medium' }),
      slot({ id: 'd', confidence: 'low' }),
    ];
    const { full, low } = splitCollapsibleSlots(slots);
    expect(full.map((s) => s.id)).toEqual(['a', 'c']);
    expect(low.map((s) => s.id)).toEqual(['b', 'd']);
  });
});

describe('isIcsExportable', () => {
  it('allows upcoming non-cancelled slots', () => {
    expect(isIcsExportable(slot())).toBe(true);
  });

  it('rejects cancelled and live slots', () => {
    expect(isIcsExportable(slot({ slot_kind: 'cancelled' }))).toBe(false);
    expect(isIcsExportable(slot({ status: 'live' }))).toBe(false);
  });
});

describe('publicSlotToIcsSlot', () => {
  it('maps partner-api field names onto the feed ics shape', () => {
    expect(publicSlotToIcsSlot(slot())).toEqual({
      id: 'slot-1',
      streamerName: 'Streamer One',
      streamTitle: 'Ranked grind',
      startTime: '2026-07-24T18:00:00Z',
      duration: 180,
      category: 'VALORANT',
    });
  });

  it('maps a null category to undefined (optional in the ics shape)', () => {
    expect(publicSlotToIcsSlot(slot({ category: null })).category).toBeUndefined();
  });
});

describe('schedulePlatforms', () => {
  it('returns distinct platforms in stable twitch-first order', () => {
    const slots = [
      slot({ id: 'a', platforms: ['youtube'] }),
      slot({ id: 'b', platforms: ['twitch', 'youtube'] }),
    ];
    expect(schedulePlatforms(slots)).toEqual(['twitch', 'youtube']);
  });

  it('returns a single platform when only one is present', () => {
    expect(schedulePlatforms([slot()])).toEqual(['twitch']);
  });

  it('returns empty for an empty schedule', () => {
    expect(schedulePlatforms([])).toEqual([]);
  });
});

// Page-weight cap. Bing flagged /game/fortnite (1.20 MB) and would have
// flagged /game/just-chatting (1.55 MB) under its 1 MB "Html size is too long"
// soft limit; each rendered slot costs ~6 KB of markup + RSC flight payload.
describe('capDaySlots', () => {
  it('passes a day under the cap through untouched', () => {
    const slots = [slot({ id: 'a' }), slot({ id: 'b' })];
    const out = capDaySlots(slots, 5);
    expect(out.slots).toBe(slots);
    expect(out.hidden).toBe(0);
  });

  it('drops low-confidence predictions before full cards', () => {
    const slots = [
      slot({ id: 'low1', confidence: 'low' }),
      slot({ id: 'high1', confidence: 'high' }),
      slot({ id: 'low2', confidence: 'low' }),
      slot({ id: 'med1', confidence: 'medium' }),
      slot({ id: 'low3', confidence: 'low' }),
    ];
    const out = capDaySlots(slots, 3);
    expect(out.slots.map((s) => s.id)).toEqual(['low1', 'high1', 'med1']);
    expect(out.hidden).toBe(2);
  });

  it('preserves the original chronological order of what it keeps', () => {
    const slots = [
      slot({ id: 'a', confidence: 'low' }),
      slot({ id: 'b', confidence: 'high' }),
      slot({ id: 'c', confidence: 'low' }),
    ];
    expect(capDaySlots(slots, 2).slots.map((s) => s.id)).toEqual(['a', 'b']);
  });

  // Without this the cap would bound nothing for a category whose predictions
  // are all high-confidence — exactly the busy categories that triggered it.
  it('still caps a day made entirely of full cards', () => {
    const slots = Array.from({ length: 30 }, (_, i) =>
      slot({ id: `h${i}`, confidence: 'high' }),
    );
    const out = capDaySlots(slots, 12);
    expect(out.slots).toHaveLength(12);
    expect(out.hidden).toBe(18);
  });

  it('keeps kept + hidden equal to the input, so the heading stays honest', () => {
    for (const size of [0, 1, 11, 12, 13, 40, 200]) {
      const slots = Array.from({ length: size }, (_, i) =>
        slot({ id: `s${i}`, confidence: i % 3 === 0 ? 'high' : 'low' }),
      );
      const out = capDaySlots(slots);
      expect(out.slots.length + out.hidden).toBe(size);
      expect(out.slots.length).toBeLessThanOrEqual(MAX_SLOTS_PER_DAY);
    }
  });
});
