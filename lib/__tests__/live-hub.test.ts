import { describe, it, expect } from 'vitest';
import type { PublicStreamSlot } from '../server/partner-api';
import { groupLiveSlotsByCategory } from '../live-hub';

function slot(overrides: Partial<PublicStreamSlot>): PublicStreamSlot {
  return {
    id: 'slot-1',
    streamer_id: 'streamer-1',
    streamer_name: 'Streamer One',
    platforms: ['twitch'],
    title: 'Live!',
    category: 'Just Chatting',
    thumbnail_url: null,
    avatar_url: null,
    start_time: '2026-07-10T12:00:00Z',
    duration_minutes: 120,
    status: 'live',
    is_predicted: false,
    confidence: 'high',
    is_always_on: false,
    twitch_login: 'streamerone',
    youtube_channel_id: null,
    streamer_timezone: null,
    ...overrides,
  };
}

describe('groupLiveSlotsByCategory', () => {
  it('returns an empty array for no slots', () => {
    expect(groupLiveSlotsByCategory([])).toEqual([]);
  });

  it('dedupes multi-platform streamers, keeping the first slot', () => {
    const groups = groupLiveSlotsByCategory([
      slot({ id: 'a', streamer_id: 's1', platforms: ['twitch'] }),
      slot({ id: 'b', streamer_id: 's1', platforms: ['youtube'] }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].slots).toHaveLength(1);
    expect(groups[0].slots[0].id).toBe('a');
  });

  it('groups by category, largest group first, ties broken by name', () => {
    const groups = groupLiveSlotsByCategory([
      slot({ streamer_id: 's1', category: 'Fortnite' }),
      slot({ streamer_id: 's2', category: 'Just Chatting' }),
      slot({ streamer_id: 's3', category: 'Just Chatting' }),
      slot({ streamer_id: 's4', category: 'Art' }),
    ]);
    expect(groups.map((g) => g.category)).toEqual(['Just Chatting', 'Art', 'Fortnite']);
  });

  it('collapses empty/whitespace categories to the null group, sorted last', () => {
    const groups = groupLiveSlotsByCategory([
      slot({ streamer_id: 's1', category: null }),
      slot({ streamer_id: 's2', category: '   ' }),
      slot({ streamer_id: 's3', category: 'Art' }),
    ]);
    expect(groups.map((g) => g.category)).toEqual(['Art', null]);
    expect(groups[1].slots).toHaveLength(2);
  });

  it('sorts slots within a group by streamer name, case-insensitive', () => {
    const groups = groupLiveSlotsByCategory([
      slot({ streamer_id: 's1', streamer_name: 'zeta' }),
      slot({ streamer_id: 's2', streamer_name: 'Alpha' }),
      slot({ streamer_id: 's3', streamer_name: 'mid' }),
    ]);
    expect(groups[0].slots.map((s) => s.streamer_name)).toEqual(['Alpha', 'mid', 'zeta']);
  });
});
