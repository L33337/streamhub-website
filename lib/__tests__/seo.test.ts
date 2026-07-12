import { describe, it, expect } from 'vitest';
import type { PublicStreamer, PublicStreamSlot } from '../server/partner-api';
import {
  buildBreadcrumbJsonLd,
  buildBroadcastEventsJsonLd,
  buildLiveVideoObjectJsonLd,
  buildProfilePageJsonLd,
  buildStreamerMetadata,
  isIndexableStreamerSlug,
  langToLocale,
  latestChange,
} from '../seo';

function makeStreamer(overrides: Partial<PublicStreamer> = {}): PublicStreamer {
  return {
    id: 'examplestreamer',
    name: 'ExampleStreamer',
    platforms: ['twitch', 'youtube'],
    avatar_url: 'https://cdn.example/avatar.jpg',
    is_featured: false,
    timezone: 'Europe/Berlin',
    language: 'de',
    is_always_on: false,
    avg_view_count: 5432,
    follower_count: 123456,
    follower_count_updated_at: '2026-07-10T04:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    last_status_change_at: '2026-07-05T12:00:00Z',
    twitch_login: 'examplestreamer',
    youtube_channel_id: 'UCabcdef',
    description: 'An example streamer.',
    ...overrides,
  };
}

type Ld = Record<string, unknown>;

describe('latestChange', () => {
  it('picks the later of the two timestamps', () => {
    expect(
      latestChange('2026-07-01T00:00:00Z', '2026-07-05T12:00:00Z').toISOString(),
    ).toBe('2026-07-05T12:00:00.000Z');
    expect(
      latestChange('2026-07-09T00:00:00Z', '2026-07-05T12:00:00Z').toISOString(),
    ).toBe('2026-07-09T00:00:00.000Z');
  });

  it('falls back to updated_at when last_status_change_at is null', () => {
    expect(latestChange('2026-07-01T00:00:00Z', null).toISOString()).toBe(
      '2026-07-01T00:00:00.000Z',
    );
  });

  it('ignores an unparseable last_status_change_at', () => {
    expect(latestChange('2026-07-01T00:00:00Z', 'not-a-date').toISOString()).toBe(
      '2026-07-01T00:00:00.000Z',
    );
  });
});

describe('buildProfilePageJsonLd', () => {
  it('wraps the Person as mainEntity of a ProfilePage', () => {
    const ld = buildProfilePageJsonLd(makeStreamer(), 'examplestreamer') as Ld;
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('ProfilePage');
    expect(ld.url).toBe('https://streamertimes.tv/streamer/examplestreamer');

    const person = ld.mainEntity as Ld;
    expect(person['@type']).toBe('Person');
    expect(person.name).toBe('ExampleStreamer');
  });

  it('keeps the #person @id on the nested Person but strips its @context', () => {
    const ld = buildProfilePageJsonLd(makeStreamer(), 'examplestreamer') as Ld;
    const person = ld.mainEntity as Ld;
    expect(person['@id']).toBe('https://streamertimes.tv/streamer/examplestreamer#person');
    expect('@context' in person).toBe(false);
  });

  it('sets dateModified to the later of updated_at and last_status_change_at', () => {
    const ld = buildProfilePageJsonLd(makeStreamer(), 'examplestreamer') as Ld;
    expect(ld.dateModified).toBe('2026-07-05T12:00:00.000Z');

    const quiet = buildProfilePageJsonLd(
      makeStreamer({ last_status_change_at: null }),
      'examplestreamer',
    ) as Ld;
    expect(quiet.dateModified).toBe('2026-07-01T00:00:00.000Z');
  });

  it('emits interactionStatistic (FollowAction) when follower_count is set', () => {
    const ld = buildProfilePageJsonLd(makeStreamer(), 'examplestreamer') as Ld;
    const person = ld.mainEntity as Ld;
    expect(person.interactionStatistic).toEqual({
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'FollowAction' },
      userInteractionCount: 123456,
    });
  });

  it('omits interactionStatistic when follower_count is null (null ≠ zero)', () => {
    const ld = buildProfilePageJsonLd(
      makeStreamer({ follower_count: null }),
      'examplestreamer',
    ) as Ld;
    const person = ld.mainEntity as Ld;
    expect('interactionStatistic' in person).toBe(false);
  });

  it('keeps interactionStatistic for an honest zero-follower count', () => {
    const ld = buildProfilePageJsonLd(
      makeStreamer({ follower_count: 0 }),
      'examplestreamer',
    ) as Ld;
    const person = ld.mainEntity as Ld;
    expect((person.interactionStatistic as Ld).userInteractionCount).toBe(0);
  });

  it('builds sameAs from platform identifiers and omits it when both are null', () => {
    const ld = buildProfilePageJsonLd(makeStreamer(), 'examplestreamer') as Ld;
    expect((ld.mainEntity as Ld).sameAs).toEqual([
      'https://twitch.tv/examplestreamer',
      'https://youtube.com/channel/UCabcdef',
    ]);

    const bare = buildProfilePageJsonLd(
      makeStreamer({ twitch_login: null, youtube_channel_id: null }),
      'examplestreamer',
    ) as Ld;
    expect('sameAs' in (bare.mainEntity as Ld)).toBe(false);
  });

  it('omits optional Person fields when their data is null', () => {
    const ld = buildProfilePageJsonLd(
      makeStreamer({ avatar_url: null, description: null, language: null }),
      'examplestreamer',
    ) as Ld;
    const person = ld.mainEntity as Ld;
    expect('image' in person).toBe(false);
    expect('description' in person).toBe(false);
    expect('knowsLanguage' in person).toBe(false);
  });

  it('URI-encodes slugs with special characters', () => {
    const ld = buildProfilePageJsonLd(makeStreamer(), 'name with space') as Ld;
    expect(ld.url).toBe('https://streamertimes.tv/streamer/name%20with%20space');
    expect((ld.mainEntity as Ld)['@id']).toBe(
      'https://streamertimes.tv/streamer/name%20with%20space#person',
    );
  });
});

describe('isIndexableStreamerSlug', () => {
  it('rejects the degenerate legacy slugs and accepts normal ids', () => {
    expect(isIndexableStreamerSlug('')).toBe(false);
    expect(isIndexableStreamerSlug('-389031')).toBe(false);
    expect(isIndexableStreamerSlug('-OPjYcQ')).toBe(false);
    expect(isIndexableStreamerSlug('xqc')).toBe(true);
    expect(isIndexableStreamerSlug('illojuan-075649')).toBe(true);
    expect(isIndexableStreamerSlug('9arm')).toBe(true);
  });
});

describe('Polish metadata (new in the body-localization rollout)', () => {
  it('maps pl to the pl_PL og:locale', () => {
    expect(langToLocale('pl')).toBe('pl_PL');
    expect(langToLocale('pl-PL')).toBe('pl_PL');
  });

  it('renders a Polish title/description from META_STRINGS.pl', () => {
    const meta = buildStreamerMetadata(
      makeStreamer({ language: 'pl', is_featured: true }),
      'examplestreamer',
    );
    expect(String(meta.title)).toContain('harmonogram streamów');
    expect(String(meta.description)).toContain('streamuje');
    expect(meta.openGraph?.locale).toBe('pl_PL');
  });
});

function makeSlot(overrides: Partial<PublicStreamSlot> = {}): PublicStreamSlot {
  return {
    id: 'slot-1',
    streamer_id: 'examplestreamer',
    streamer_name: 'ExampleStreamer',
    platforms: ['twitch'],
    title: 'Ranked grind!',
    category: 'Just Chatting',
    thumbnail_url: 'https://static-cdn.example/live_user_example-440x248.jpg',
    avatar_url: 'https://cdn.example/slot-avatar.jpg',
    start_time: '2026-07-12T18:00:00Z',
    duration_minutes: 120,
    status: 'live',
    is_predicted: false,
    confidence: 'high',
    is_always_on: false,
    twitch_login: 'examplestreamer',
    youtube_channel_id: null,
    streamer_timezone: 'Europe/Berlin',
    ...overrides,
  };
}

describe('buildLiveVideoObjectJsonLd', () => {
  // Render "now" 30 minutes into the stream.
  const NOW = new Date('2026-07-12T18:30:00Z');

  it('emits the LIVE-badge shape for a live slot', () => {
    const ld = buildLiveVideoObjectJsonLd(makeStreamer(), makeSlot(), 'examplestreamer', NOW) as Ld;
    expect(ld['@type']).toBe('VideoObject');
    expect(ld.name).toBe('Ranked grind!');
    expect(ld.uploadDate).toBe('2026-07-12T18:00:00.000Z');
    expect(ld.thumbnailUrl).toEqual([
      'https://static-cdn.example/live_user_example-440x248.jpg',
      'https://cdn.example/slot-avatar.jpg',
    ]);
    expect(ld.description).toBe('Ranked grind! — Just Chatting — ExampleStreamer');
    expect(ld.inLanguage).toBe('de');

    const pub = ld.publication as Ld;
    expect(pub['@type']).toBe('BroadcastEvent');
    expect(pub.isLiveBroadcast).toBe(true);
    expect(pub.startDate).toBe('2026-07-12T18:00:00.000Z');
  });

  it('returns null for non-live slots', () => {
    expect(
      buildLiveVideoObjectJsonLd(makeStreamer(), makeSlot({ status: 'upcoming' }), 's', NOW),
    ).toBeNull();
    expect(
      buildLiveVideoObjectJsonLd(makeStreamer(), makeSlot({ status: 'offline' }), 's', NOW),
    ).toBeNull();
  });

  it('returns null when no thumbnail is available (REQUIRED property)', () => {
    const ld = buildLiveVideoObjectJsonLd(
      makeStreamer({ avatar_url: null }),
      makeSlot({ thumbnail_url: null, avatar_url: null }),
      's',
      NOW,
    );
    expect(ld).toBeNull();
  });

  it('falls back through the thumbnail chain: slot avatar, then streamer avatar', () => {
    const slotAvatar = buildLiveVideoObjectJsonLd(
      makeStreamer(),
      makeSlot({ thumbnail_url: null }),
      's',
      NOW,
    ) as Ld;
    expect(slotAvatar.thumbnailUrl).toEqual(['https://cdn.example/slot-avatar.jpg']);

    const streamerAvatar = buildLiveVideoObjectJsonLd(
      makeStreamer(),
      makeSlot({ thumbnail_url: null, avatar_url: null }),
      's',
      NOW,
    ) as Ld;
    expect(streamerAvatar.thumbnailUrl).toEqual(['https://cdn.example/avatar.jpg']);
  });

  it('prefers the Twitch player embed and hardcodes the production parent', () => {
    const ld = buildLiveVideoObjectJsonLd(
      makeStreamer(),
      makeSlot({ youtube_channel_id: 'UCabcdef' }),
      's',
      NOW,
    ) as Ld;
    expect(ld.embedUrl).toBe(
      'https://player.twitch.tv/?channel=examplestreamer&parent=streamertimes.tv',
    );
  });

  it('falls back to the YouTube channel live embed and omits embedUrl without ids', () => {
    const yt = buildLiveVideoObjectJsonLd(
      makeStreamer(),
      makeSlot({ twitch_login: null, youtube_channel_id: 'UCabcdef' }),
      's',
      NOW,
    ) as Ld;
    expect(yt.embedUrl).toBe('https://www.youtube.com/embed/live_stream?channel=UCabcdef');

    const none = buildLiveVideoObjectJsonLd(
      makeStreamer(),
      makeSlot({ twitch_login: null, youtube_channel_id: null }),
      's',
      NOW,
    ) as Ld;
    expect('embedUrl' in none).toBe(false);
  });

  it('uses start+duration as endDate while that lies further out than now+1h', () => {
    const ld = buildLiveVideoObjectJsonLd(makeStreamer(), makeSlot(), 's', NOW) as Ld;
    // 18:00 + 120min = 20:00 > 18:30 + 1h = 19:30
    expect((ld.publication as Ld).endDate).toBe('2026-07-12T20:00:00.000Z');
  });

  it('keeps endDate ≥ now+1h for overrunning and always-on streams', () => {
    // Stream started 20h ago with a 60-min planned duration: start+duration is
    // long past — endDate must never sit in the past while live (no badge).
    const stale = buildLiveVideoObjectJsonLd(
      makeStreamer(),
      makeSlot({ start_time: '2026-07-11T22:00:00Z', duration_minutes: 60 }),
      's',
      NOW,
    ) as Ld;
    expect((stale.publication as Ld).endDate).toBe('2026-07-12T19:30:00.000Z');
  });

  it('treats a non-positive duration as 60 minutes', () => {
    const ld = buildLiveVideoObjectJsonLd(
      makeStreamer(),
      makeSlot({ duration_minutes: 0, start_time: '2026-07-12T18:00:00Z' }),
      's',
      new Date('2026-07-12T18:05:00Z'),
    ) as Ld;
    // start+60min = 19:00 < now+1h = 19:05 → now+1h wins
    expect((ld.publication as Ld).endDate).toBe('2026-07-12T19:05:00.000Z');
  });

  it('omits null description parts and inLanguage without a language', () => {
    const ld = buildLiveVideoObjectJsonLd(
      makeStreamer({ language: null }),
      makeSlot({ category: null }),
      's',
      NOW,
    ) as Ld;
    expect(ld.description).toBe('Ranked grind! — ExampleStreamer');
    expect('inLanguage' in ld).toBe(false);
  });
});

describe('buildBroadcastEventsJsonLd', () => {
  const slots = [
    makeSlot({ id: 'live-1', status: 'live' }),
    makeSlot({ id: 'up-1', status: 'upcoming', start_time: '2026-07-13T18:00:00Z' }),
    makeSlot({ id: 'off-1', status: 'offline' }),
  ];

  it('emits events for live and upcoming slots only, referencing #person', () => {
    const events = buildBroadcastEventsJsonLd(makeStreamer(), slots, 'examplestreamer') as Ld[];
    expect(events).toHaveLength(2);
    expect(events[0].isLiveBroadcast).toBe(true);
    expect(events[0].broadcaster).toEqual({
      '@id': 'https://streamertimes.tv/streamer/examplestreamer#person',
    });
  });

  it('excludes exactly the slot covered by the VideoObject', () => {
    const events = buildBroadcastEventsJsonLd(
      makeStreamer(),
      slots,
      'examplestreamer',
      'live-1',
    ) as Ld[];
    expect(events).toHaveLength(1);
    expect(events[0].startDate).toBe('2026-07-13T18:00:00.000Z');
  });

  it('caps at 10 events, with the exclusion applied before the cap', () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      makeSlot({ id: `up-${i}`, status: 'upcoming' }),
    );
    expect(buildBroadcastEventsJsonLd(makeStreamer(), many, 's')).toHaveLength(10);
    // Excluding one of the first 10 lets the 11th slide in — still 10 events.
    const excluded = buildBroadcastEventsJsonLd(makeStreamer(), many, 's', 'up-3') as Ld[];
    expect(excluded).toHaveLength(10);
  });
});

describe('buildBreadcrumbJsonLd', () => {
  it('numbers the positions and omits the url on the final crumb', () => {
    const ld = buildBreadcrumbJsonLd([
      { name: 'Home', url: 'https://streamertimes.tv' },
      { name: 'Streamers', url: 'https://streamertimes.tv/streamers' },
      { name: 'ExampleStreamer' },
    ]) as { itemListElement: Array<Record<string, unknown>> };
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[0].item).toBe('https://streamertimes.tv');
    expect(ld.itemListElement[2].position).toBe(3);
    expect('item' in ld.itemListElement[2]).toBe(false);
  });
});
