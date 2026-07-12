import { describe, it, expect } from 'vitest';
import type { PublicStreamer } from '../server/partner-api';
import {
  buildBreadcrumbJsonLd,
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
