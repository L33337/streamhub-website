import { describe, expect, it } from 'vitest';
import type {
  PublicRankingEntry,
  PublicStreamer,
  PublicStreamSlot,
} from '@/lib/server/partner-api';
import { hubLexFor } from '@/lib/i18n-hub';
import { getRankingPageSpec } from '@/lib/rankings';
import { toRankingHeaders, toRankingRow } from '@/lib/rankings-row';

const lex = hubLexFor('en').rankings;
const followed = getRankingPageSpec('most-followed')!;

function streamer(overrides: Partial<PublicStreamer> = {}): PublicStreamer {
  return {
    id: 'examplestreamer',
    name: 'ExampleStreamer',
    platforms: ['twitch'],
    avatar_url: null,
    is_featured: false,
    timezone: null,
    language: 'de',
    is_always_on: false,
    avg_view_count: 1200,
    follower_count: 50_000,
    follower_count_updated_at: null,
    updated_at: '2026-07-17T00:00:00Z',
    last_status_change_at: null,
    twitch_login: 'examplestreamer',
    youtube_channel_id: null,
    description: null,
    ...overrides,
  };
}

function entry(overrides: Partial<PublicRankingEntry> = {}): PublicRankingEntry {
  return {
    rank: 12,
    values: { follower_count: 50_000 },
    streamer: streamer(),
    ...overrides,
  };
}

function slot(overrides: Partial<PublicStreamSlot> = {}): PublicStreamSlot {
  return {
    id: 'slot-1',
    streamer_id: 'examplestreamer',
    streamer_name: 'ExampleStreamer',
    platforms: ['twitch'],
    title: 'Stream',
    category: 'Fortnite',
    thumbnail_url: null,
    avatar_url: null,
    start_time: '2026-08-09T18:00:00Z',
    duration_minutes: 180,
    status: 'upcoming',
    is_predicted: true,
    confidence: 'high',
    ...overrides,
  } as PublicStreamSlot;
}

describe('toRankingRow', () => {
  it('resolves everything the browser needs to render a row', () => {
    const row = toRankingRow(entry(), { columns: followed.columns, lex, locale: 'en' });
    expect(row).toMatchObject({
      rank: 12,
      streamerId: 'examplestreamer',
      name: 'ExampleStreamer',
      href: '/streamer/examplestreamer',
      platforms: ['twitch'],
      languageLabel: 'German',
      isLive: false,
      // Registry-owned English number formatting, one string per column.
      values: ['50K', '1.2K'],
      trend: null,
      mainGame: null,
      nextStream: null,
    });
  });

  it('keeps the ABSOLUTE rank — a filtered preview must not renumber to 1..5', () => {
    expect(toRankingRow(entry({ rank: 88 }), {
      columns: followed.columns,
      lex,
      locale: 'en',
    }).rank).toBe(88);
  });

  it('prefixes streamer links with the viewer locale and encodes the id', () => {
    const row = toRankingRow(entry({ streamer: streamer({ id: 'a b/c' }) }), {
      columns: followed.columns,
      lex,
      locale: 'de',
    });
    expect(row.href).toBe('/de/streamer/a%20b%2Fc');
  });

  it('localizes the language name for the viewer, not the streamer', () => {
    expect(
      toRankingRow(entry(), { columns: followed.columns, lex: hubLexFor('de').rankings, locale: 'de' })
        .languageLabel,
    ).toBe('Deutsch');
  });

  it('leaves the language label out when the code is unknown', () => {
    const row = toRankingRow(entry({ streamer: streamer({ language: null }) }), {
      columns: followed.columns,
      lex,
      locale: 'en',
    });
    expect(row.languageLabel).toBeNull();
  });

  it('right-sizes the avatar instead of shipping the source URL', () => {
    const row = toRankingRow(
      entry({
        streamer: streamer({
          avatar_url:
            'https://static-cdn.jtvnw.net/jtv_user_pictures/abc-profile_image-300x300.png',
        }),
      }),
      { columns: followed.columns, lex, locale: 'en' },
    );
    expect(row.avatarUrl).not.toContain('300x300');
    expect(row.avatarUrl).toContain('jtv_user_pictures/abc-profile_image-');
  });

  it('marks live rows only when the id is in the live set', () => {
    const ctx = {
      columns: followed.columns,
      lex,
      locale: 'en' as const,
      liveIds: new Set(['examplestreamer']),
    };
    expect(toRankingRow(entry(), ctx).isLive).toBe(true);
    expect(
      toRankingRow(entry({ streamer: streamer({ id: 'someone-else' }) }), ctx).isLive,
    ).toBe(false);
  });

  it('renders the week-over-week trend, including the "new entry" case', () => {
    const ctx = { columns: followed.columns, lex, locale: 'en' as const };
    expect(
      toRankingRow(entry({ rank: 4, values: { follower_count: 1, previous_rank: 9 } }), ctx)
        .trend,
    ).toEqual({ kind: 'up', delta: 5, title: lex.trendMoveTitle(true, 5) });
    expect(
      toRankingRow(entry({ rank: 9, values: { follower_count: 1, previous_rank: 4 } }), ctx)
        .trend,
    ).toEqual({ kind: 'down', delta: 5, title: lex.trendMoveTitle(false, 5) });
    expect(
      toRankingRow(entry({ values: { follower_count: 1, previous_rank: null } }), ctx).trend,
    ).toEqual({ kind: 'new', label: lex.trendNewLabel, title: lex.trendNewTitle });
    // Key absent entirely = the backend's snapshot history is still warming up.
    expect(toRankingRow(entry({ values: { follower_count: 1 } }), ctx).trend).toBeNull();
  });

  it('links the main game only where a ranking page exists', () => {
    const withCategory = entry({
      top_category: { category: 'Just Chatting', share_percent: 62 },
    });
    const linked = toRankingRow(withCategory, {
      columns: followed.columns,
      lex,
      locale: 'en',
      mainGameSlugs: new Map([['Just Chatting', 'just-chatting']]),
    });
    expect(linked.mainGame).toEqual({
      label: 'Just Chatting',
      href: '/rankings/game/just-chatting',
      title: lex.mainGameShareTitle(62),
    });
    const unlinked = toRankingRow(withCategory, {
      columns: followed.columns,
      lex,
      locale: 'en',
      mainGameSlugs: new Map(),
    });
    expect(unlinked.mainGame?.href).toBeNull();
  });

  it('omits the main game entirely when the column is not rendered', () => {
    const row = toRankingRow(
      entry({ top_category: { category: 'Just Chatting', share_percent: 62 } }),
      { columns: followed.columns, lex, locale: 'en' },
    );
    expect(row.mainGame).toBeNull();
  });

  it('renders 24/7 channels as always-on, ignoring any slot', () => {
    const row = toRankingRow(entry({ streamer: streamer({ is_always_on: true }) }), {
      columns: followed.columns,
      lex,
      locale: 'en',
      nextSlots: new Map([['examplestreamer', slot()]]),
    });
    expect(row.nextStream).toEqual({ kind: 'always-on', title: lex.alwaysOnTitle });
  });

  it('carries the next slot verbatim, minus the category of a cancelled one', () => {
    const ctx = {
      columns: followed.columns,
      lex,
      locale: 'en' as const,
      nextSlots: new Map([['examplestreamer', slot()]]),
    };
    expect(toRankingRow(entry(), ctx).nextStream).toEqual({
      kind: 'slot',
      startTime: '2026-08-09T18:00:00Z',
      isPredicted: true,
      category: 'Fortnite',
    });

    const cancelled = {
      ...ctx,
      nextSlots: new Map([['examplestreamer', slot({ slot_kind: 'cancelled' })]]),
    };
    expect(toRankingRow(entry(), cancelled).nextStream).toEqual({
      kind: 'slot',
      startTime: '2026-08-09T18:00:00Z',
      isPredicted: true,
      category: null,
    });
  });

  it('renders an empty next-stream cell when nothing is scheduled', () => {
    const row = toRankingRow(entry(), {
      columns: followed.columns,
      lex,
      locale: 'en',
      nextSlots: new Map(),
    });
    expect(row.nextStream).toBeNull();
  });
});

describe('toRankingHeaders', () => {
  it('localizes known headers and flags the primary column', () => {
    const headers = toRankingHeaders(followed.columns, hubLexFor('de').rankings);
    expect(headers[0].primary).toBe(true);
    expect(headers[1].primary).toBe(false);
    expect(headers).toHaveLength(followed.columns.length);
    expect(headers[0].label).toBe(hubLexFor('de').rankings.tableHeaders['Followers']);
  });

  it('falls back to the registry header instead of crashing on an unknown key', () => {
    const headers = toRankingHeaders(
      [{ key: 'x', header: 'Brand New Column', primary: true, format: () => '1' }],
      lex,
    );
    expect(headers).toEqual([{ label: 'Brand New Column', primary: true }]);
  });

  it('stays index-aligned with the row values', () => {
    const row = toRankingRow(entry(), { columns: followed.columns, lex, locale: 'en' });
    expect(row.values).toHaveLength(toRankingHeaders(followed.columns, lex).length);
  });
});
