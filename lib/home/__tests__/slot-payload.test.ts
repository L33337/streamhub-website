import { describe, it, expect } from 'vitest';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { pickReasoning } from '@/lib/slot-copy';
import { toLineupCardSlot, toLiveCardSlot } from '../slot-payload';
import { liveWatchUrl } from '../live-rail';

function slot(overrides: Partial<PublicStreamSlot> = {}): PublicStreamSlot {
  return {
    id: 'slot-1',
    streamer_id: 'streamer-1',
    streamer_name: 'Streamer One',
    platforms: ['twitch'],
    title: 'A stream',
    category: 'Just Chatting',
    thumbnail_url: null,
    avatar_url: 'https://cdn.example/avatar.png',
    start_time: '2026-08-01T20:00:00Z',
    duration_minutes: 240,
    status: 'upcoming',
    is_predicted: true,
    confidence: 'high',
    slot_kind: 'regular',
    is_always_on: false,
    twitch_login: 'streamerone',
    youtube_channel_id: 'UCabc',
    streamer_timezone: 'Europe/Berlin',
    streamer_language: 'de',
    viewer_count: null,
    reasoning: 'Sie streamt fast jeden Donnerstagabend zur selben Zeit.',
    copy_language: 'de',
    generic_reasoning: 'Regular weekday slot with a consistent four-week pattern.',
    ...overrides,
  };
}

describe('toLineupCardSlot', () => {
  // THE property this whole optimization rests on: the card re-runs
  // pickReasoning on the pruned payload, so the pruning may not change what it
  // resolves to — text, generic-label and `lang` attribute alike.
  it.each([
    ['copy in the viewer language', { copy_language: 'de' }, 'de'],
    ['copy in English', { copy_language: 'en' }, 'de'],
    ['copy in a third language (falls back to generic)', { copy_language: 'ja' }, 'de'],
    ['copy in a third language, no generic', { copy_language: 'ja', generic_reasoning: undefined }, 'de'],
    ['unknown copy language', { copy_language: null }, 'en'],
    ['no reasoning at all', { reasoning: undefined }, 'en'],
    ['neither text', { reasoning: undefined, generic_reasoning: undefined }, 'fr'],
    ['blank reasoning', { reasoning: '   ' }, 'en'],
  ])('round-trips pickReasoning for %s', (_label, overrides, viewer) => {
    const full = slot(overrides as Partial<PublicStreamSlot>);
    const expected = pickReasoning(full, viewer);
    expect(pickReasoning(toLineupCardSlot(full, viewer), viewer)).toEqual(expected);
  });

  it('ships only ONE copy text — never both', () => {
    const pruned = toLineupCardSlot(slot({ copy_language: 'ja' }), 'de');
    // Viewer reads neither ja nor... well, ja isn't de or en, so the English
    // generic wins and the (unreadable) real copy must not travel with it.
    expect(pruned.generic_reasoning).toBeDefined();
    expect(pruned.reasoning).toBeUndefined();

    const own = toLineupCardSlot(slot({ copy_language: 'de' }), 'de');
    expect(own.reasoning).toBeDefined();
    expect(own.generic_reasoning).toBeUndefined();
  });

  it('drops the fields no card reads', () => {
    const pruned = toLineupCardSlot(slot(), 'de') as Record<string, unknown>;
    for (const key of [
      'streamer_id',
      'twitch_login',
      'youtube_channel_id',
      'streamer_language',
    ]) {
      expect(pruned, `${key} must not be shipped`).not.toHaveProperty(key);
    }
  });

  it('omits slot_kind when it carries no information', () => {
    // The DTO documents an absent slot_kind as 'regular', so shipping the word
    // is 25 bytes per card for nothing.
    expect(toLineupCardSlot(slot({ slot_kind: 'regular' }), 'en')).not.toHaveProperty(
      'slot_kind',
    );
    expect(toLineupCardSlot(slot({ slot_kind: undefined }), 'en')).not.toHaveProperty(
      'slot_kind',
    );
    expect(toLineupCardSlot(slot({ slot_kind: 'cancelled' }), 'en').slot_kind).toBe(
      'cancelled',
    );
    expect(toLineupCardSlot(slot({ slot_kind: 'new' }), 'en').slot_kind).toBe('new');
  });

  it('keeps every field the status line is derived from', () => {
    const pruned = toLineupCardSlot(
      slot({ streamer_timezone: 'Asia/Tokyo', is_always_on: true }),
      'en',
    );
    expect(pruned.start_time).toBe('2026-08-01T20:00:00Z');
    expect(pruned.duration_minutes).toBe(240);
    expect(pruned.status).toBe('upcoming');
    expect(pruned.is_always_on).toBe(true);
    expect(pruned.streamer_timezone).toBe('Asia/Tokyo');
    expect(pruned.is_predicted).toBe(true);
  });

  it('omits viewer_count unless it is a real number', () => {
    expect(toLineupCardSlot(slot({ viewer_count: null }), 'en')).not.toHaveProperty(
      'viewer_count',
    );
    expect(toLineupCardSlot(slot({ viewer_count: 0 }), 'en').viewer_count).toBe(0);
  });
});

describe('toLiveCardSlot', () => {
  it('keeps the channel id of the platform the slot is live on', () => {
    const twitchOnly = toLiveCardSlot(
      slot({ platforms: ['twitch'], status: 'live' }),
    );
    expect(twitchOnly.twitch_login).toBe('streamerone');
    expect(twitchOnly).not.toHaveProperty('youtube_channel_id');

    const ytOnly = toLiveCardSlot(
      slot({ platforms: ['youtube'], status: 'live', twitch_login: 'ghost' }),
    );
    expect(ytOnly.youtube_channel_id).toBe('UCabc');
    expect(ytOnly).not.toHaveProperty('twitch_login');
  });

  // Pruning must not change where a card links — that is the one thing this
  // rail does differently from every other card on the site.
  it.each([
    [['twitch'] as const, 'https://twitch.tv/streamerone'],
    [['youtube'] as const, 'https://youtube.com/channel/UCabc/live'],
    [['twitch', 'youtube'] as const, 'https://twitch.tv/streamerone'],
  ])('preserves the watch URL for %s', (platforms, expected) => {
    const full = slot({ platforms: [...platforms], status: 'live' });
    expect(liveWatchUrl(toLiveCardSlot(full))).toBe(expected);
    expect(liveWatchUrl(toLiveCardSlot(full))).toBe(liveWatchUrl(full));
  });

  it('falls back to the internal link when no channel id survives', () => {
    const noIds = toLiveCardSlot(
      slot({ platforms: ['twitch'], twitch_login: null, status: 'live' }),
    );
    expect(liveWatchUrl(noIds)).toBeNull();
  });

  it('drops the fields the live card never reads', () => {
    const pruned = toLiveCardSlot(slot({ status: 'live' })) as Record<string, unknown>;
    for (const key of [
      'reasoning',
      'generic_reasoning',
      'copy_language',
      'confidence',
      'slot_kind',
      'status',
      'streamer_timezone',
      'streamer_language',
      'is_predicted',
    ]) {
      expect(pruned, `${key} must not be shipped`).not.toHaveProperty(key);
    }
  });

  it('keeps what the runtime line and the favourite heart need', () => {
    const pruned = toLiveCardSlot(
      slot({ status: 'live', viewer_count: 4210, is_always_on: true }),
    );
    expect(pruned.streamer_id).toBe('streamer-1');
    expect(pruned.start_time).toBe('2026-08-01T20:00:00Z');
    expect(pruned.duration_minutes).toBe(240);
    expect(pruned.is_always_on).toBe(true);
    expect(pruned.viewer_count).toBe(4210);
  });
});
