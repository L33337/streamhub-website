import { describe, expect, it } from 'vitest';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  isIcsExportable,
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
