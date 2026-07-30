import { describe, it, expect } from 'vitest';
import type {
  PublicStreamer,
  PublicStreamerStats,
  PublicStreamSlot,
} from '../server/partner-api';
import {
  buildBreadcrumbJsonLd,
  buildBroadcastEventsJsonLd,
  buildLiveVideoObjectJsonLd,
  buildProfilePageJsonLd,
  buildStreamerMetadata,
  buildVideoGameJsonLd,
  isIndexableStreamerSlug,
  jsonLdHtml,
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

  // M22 P3 regression (2026-07-27): the event description must be the text the
  // slot card actually renders, so the English URL never carries foreign prose.
  it('description follows the viewer locale like the visible card does', () => {
    const foreign = [
      makeSlot({
        id: 'up-9',
        status: 'upcoming',
        reasoning: 'Deutsche Begründung',
        copy_language: 'de',
        generic_reasoning: 'English template summary',
      }),
    ];
    const en = buildBroadcastEventsJsonLd(makeStreamer(), foreign, 's', undefined, 'en') as Ld[];
    expect(en[0].description).toBe('English template summary');
    const de = buildBroadcastEventsJsonLd(makeStreamer(), foreign, 's', undefined, 'de') as Ld[];
    expect(de[0].description).toBe('Deutsche Begründung');
    // inLanguage keeps describing the BROADCAST, not the rendered copy.
    expect(en[0].inLanguage).toBe('de');
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

describe('buildStreamerMetadata — next-stream time in the description', () => {
  const next = () =>
    makeSlot({
      status: 'upcoming',
      is_predicted: true,
      start_time: '2026-07-18T19:00:00Z', // Sat 21:00 in Europe/Berlin (CEST)
    });

  it('renders the time streamer-local with a localized zone label', () => {
    const meta = buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
      nextSlot: next(),
    });
    expect(String(meta.description)).toContain('Sa 21:00 (Ortszeit Berlin)');
    expect(String(meta.description)).not.toContain('UTC');
  });

  it('keeps the UTC form without a usable timezone', () => {
    const meta = buildStreamerMetadata(
      makeStreamer({ timezone: null }),
      'examplestreamer',
      { nextSlot: next() },
    );
    expect(String(meta.description)).toContain('Sa 19:00 UTC');
  });
});

function makeStats(overrides: Partial<PublicStreamerStats> = {}): PublicStreamerStats {
  return {
    streamer_id: 'examplestreamer',
    has_stats: true,
    window_days: 28,
    sample_size: 23,
    source: 'vod',
    timezone: 'Europe/Berlin',
    typical_start: '20:00',
    typical_end: '23:30',
    typical_duration_minutes: 210,
    streams_per_week: 3,
    active_days_per_week: 3,
    hours_streamed: 60,
    peak_viewer_count: 1234,
    weekdays: [
      { weekday: 'tuesday', start: '20:00', end: '23:30', duration_minutes: 210 },
      { weekday: 'thursday', start: '20:00', end: '23:30', duration_minutes: 210 },
      { weekday: 'saturday', start: '20:00', end: '23:30', duration_minutes: 210 },
    ] as PublicStreamerStats['weekdays'],
    top_categories: [],
    ...overrides,
  };
}

describe('buildStreamerMetadata — evergreen description', () => {
  const next = () =>
    makeSlot({
      status: 'upcoming',
      is_predicted: true,
      start_time: '2026-07-18T19:00:00Z', // Sat 21:00 in Europe/Berlin (CEST)
    });

  it('leads with the weekly rhythm and follows with the next start', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        nextSlot: next(),
        stats: makeStats(),
      }).description,
    );
    // Evergreen half first: it is what survives SERP truncation and a
    // days-old crawl.
    expect(desc.indexOf('Di, Do, Sa')).toBeLessThan(desc.indexOf('Nächster Stream'));
    expect(desc).toContain('ExampleStreamer streamt meist Di, Do, Sa, 20:00–23:30 Uhr');
  });

  it('names the calendar date so a cached snippet stays unambiguous', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        nextSlot: next(),
        stats: makeStats(),
      }).description,
    );
    expect(desc).toContain('Sa., 18. Juli, 21:00');
  });

  it('keeps the prediction hedge visible', () => {
    const predicted = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        nextSlot: next(),
        stats: makeStats(),
      }).description,
    );
    const announced = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        nextSlot: makeSlot({
          status: 'upcoming',
          is_predicted: false,
          start_time: '2026-07-18T19:00:00Z',
        }),
        stats: makeStats(),
      }).description,
    );
    expect(predicted).toContain('voraussichtlich');
    expect(announced).not.toContain('voraussichtlich');
  });

  it('states the timezone exactly once', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        nextSlot: next(),
        stats: makeStats(),
      }).description,
    );
    expect(desc.match(/Ortszeit Berlin/g)).toHaveLength(1);
  });

  it('moves the zone onto the next-stream clause when the rhythm has no times', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        nextSlot: next(),
        stats: makeStats({ typical_start: null, typical_end: null }),
      }).description,
    );
    expect(desc.match(/Ortszeit Berlin/g)).toHaveLength(1);
    expect(desc).toContain('Sa., 18. Juli, 21:00 (Ortszeit Berlin)');
  });

  it('renders one zone even when the stats and streamer zones disagree', () => {
    // The habit clause declares the stats zone, so the start time must be
    // rendered in that same zone — never Berlin hours labelled "New York time".
    const desc = String(
      buildStreamerMetadata(
        makeStreamer({ timezone: 'Europe/Berlin' }),
        'examplestreamer',
        { nextSlot: next(), stats: makeStats({ timezone: 'America/New_York' }) },
      ).description,
    );
    expect(desc).toContain('Ortszeit New York');
    expect(desc).not.toContain('Ortszeit Berlin');
    expect(desc).toContain('15:00'); // 19:00Z in New York
  });

  it('answers with the rhythm alone when nothing is scheduled', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        stats: makeStats(),
      }).description,
    );
    expect(desc).toBe('ExampleStreamer streamt meist Di, Do, Sa, 20:00–23:30 Uhr (Ortszeit Berlin).');
  });

  it('drops the next-stream clause instead of clipping its date mid-word', () => {
    const desc = String(
      buildStreamerMetadata(
        makeStreamer({ name: 'A'.repeat(70) }),
        'examplestreamer',
        { nextSlot: next(), stats: makeStats() },
      ).description,
    );
    expect(desc).not.toContain('Nächster Stream');
    expect(desc).not.toContain('…');
    expect(desc).toContain('20:00–23:30 Uhr');
  });

  it('falls back to the next-stream-only phrasing without usable stats', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        nextSlot: next(),
        stats: makeStats({ weekdays: [] }),
      }).description,
    );
    expect(desc).toContain('Voraussichtlich nächster Stream von ExampleStreamer');
    expect(desc).toContain('Sa 21:00 (Ortszeit Berlin)');
  });

  it('keeps the live status leading, ahead of the evergreen tail', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        liveSlot: makeSlot({ status: 'live' }),
        stats: makeStats(),
      }).description,
    );
    // Inverse of the offline branch: "live now" is the timely fact the page
    // exists for, so it goes first and the rhythm follows.
    expect(desc.indexOf('streamt gerade')).toBeLessThan(desc.indexOf('Übliche Sendezeiten'));
  });
});

describe('buildStreamerMetadata — evergreen tail on LIVE descriptions', () => {
  // The state EventSub leaves behind before enrichment: live, but no category
  // and no title yet. Bing flagged exactly these pages as "description too
  // short" (2026-07-29).
  // `title` is optional on the DTO, `category` nullable — hence the mixed pair.
  const bareLive = () => makeSlot({ status: 'live', category: null, title: undefined });

  it('extends a bare "is live now" with the weekly rhythm', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        liveSlot: bareLive(),
        stats: makeStats(),
      }).description,
    );
    expect(desc).toBe(
      'ExampleStreamer ist gerade live. Übliche Sendezeiten: Di, Do, Sa, 20:00–23:30 Uhr (Ortszeit Berlin).',
    );
    // The whole point of the fix: past Bing's ~100-char short-description gate.
    // The fixture's short name lands exactly on it; real names are longer.
    expect(desc.length).toBeGreaterThanOrEqual(100);
  });

  it('states the timezone exactly once', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        liveSlot: bareLive(),
        stats: makeStats(),
      }).description,
    );
    expect(desc.match(/Ortszeit Berlin/g)).toHaveLength(1);
  });

  it('falls back to a static tail when the stats carry no weekdays', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        liveSlot: bareLive(),
        stats: makeStats({ weekdays: [] }),
      }).description,
    );
    expect(desc).toBe(
      'ExampleStreamer ist gerade live. Sendezeiten, typische Stream-Zeiten und Live-Status.',
    );
  });

  it('uses the static tail when no stats were loaded at all', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        liveSlot: bareLive(),
      }).description,
    );
    expect(desc).toContain('Sendezeiten, typische Stream-Zeiten und Live-Status.');
  });

  it('drops the tail whole rather than let truncate clip it mid-sentence', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        liveSlot: makeSlot({ status: 'live', title: 'R'.repeat(120) }),
        stats: makeStats(),
      }).description,
    );
    expect(desc).not.toContain('Übliche Sendezeiten');
    // A live slot with a full title already fills the budget on its own.
    expect(desc.length).toBeGreaterThan(100);
  });

  it('renders the tail in the viewer locale, not the streamer language', () => {
    const desc = String(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        liveSlot: bareLive(),
        stats: makeStats(),
        viewerLocale: 'en',
      }).description,
    );
    expect(desc).toContain('is live now.');
    expect(desc).toContain('Usual schedule: Tue, Thu, Sat, 20:00–23:30 (Berlin time)');
  });

  it('never exceeds the SERP description budget', () => {
    for (const locale of ['en', 'de', 'ja', 'ar', 'pl'] as const) {
      const desc = String(
        buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
          liveSlot: makeSlot({ status: 'live', title: 'R'.repeat(60) }),
          stats: makeStats(),
          viewerLocale: locale,
        }).description,
      );
      expect(desc.length).toBeLessThanOrEqual(155);
    }
  });
});

describe('buildStreamerMetadata — index gate vs. cancelled slots', () => {
  it('stays indexable when the only upcoming slot is a cancellation', () => {
    // No `nextSlot` (a cancellation is not a next stream) but the page still
    // renders real content: "this Tuesday is cancelled".
    const meta = buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
      hasUpcoming: true,
    });
    expect(meta.robots).toBeUndefined();
    // …and it must not promise a next stream it cannot name.
    expect(String(meta.title)).not.toContain('Nächster Stream');
  });

  it('noindexes a page with nothing upcoming at all', () => {
    const meta = buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
      hasUpcoming: false,
    });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it('defaults hasUpcoming to the next slot for callers that omit it', () => {
    expect(
      buildStreamerMetadata(makeStreamer(), 'examplestreamer', {
        nextSlot: makeSlot({ status: 'upcoming', start_time: '2026-07-18T19:00:00Z' }),
      }).robots,
    ).toBeUndefined();
  });
});

describe('buildVideoGameJsonLd', () => {
  it('emits VideoGame with name, url and image', () => {
    const ld = buildVideoGameJsonLd({
      name: 'Fortnite',
      url: 'https://streamertimes.tv/game/fortnite',
      imageUrl: 'https://static-cdn.jtvnw.net/ttv-boxart/33214-285x380.jpg',
    }) as Record<string, unknown>;
    expect(ld['@type']).toBe('VideoGame');
    expect(ld.name).toBe('Fortnite');
    expect(ld.url).toBe('https://streamertimes.tv/game/fortnite');
    expect(ld.image).toBe('https://static-cdn.jtvnw.net/ttv-boxart/33214-285x380.jpg');
  });

  it('omits image when box art is unknown', () => {
    const ld = buildVideoGameJsonLd({
      name: 'Obscure Game',
      url: 'https://streamertimes.tv/game/obscure-game',
      imageUrl: null,
    }) as Record<string, unknown>;
    expect('image' in ld).toBe(false);
  });
});

describe('jsonLdHtml (XSS-safe JSON-LD serialization)', () => {
  it('escapes < so a closing script tag cannot break out', () => {
    const html = jsonLdHtml({ name: "</script><img src=x onerror=alert(1)>" });
    expect(html).not.toContain("</script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("\\u003c");
  });

  it('escapes U+2028 / U+2029 line separators', () => {
    const html = jsonLdHtml({ a: String.fromCharCode(0x2028), b: String.fromCharCode(0x2029) });
    expect(html).not.toContain(String.fromCharCode(0x2028));
    expect(html).not.toContain(String.fromCharCode(0x2029));
    expect(html).toContain("\\u2028");
    expect(html).toContain("\\u2029");
  });

  it('round-trips back to the original object via JSON.parse', () => {
    const obj = { name: "</script>", note: 'a' + String.fromCharCode(0x2028) + 'b' };
    expect(JSON.parse(jsonLdHtml(obj))).toEqual(obj);
  });
});
