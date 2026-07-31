import { describe, it, expect } from 'vitest';
import type { FeedClip } from '@/lib/feed/types';
import {
  buildClipFilterItems,
  computeVisibleClipIds,
  countClipFilterOptions,
  matchesClipFilters,
  CLIPS_DEFAULT_VISIBLE,
  HOME_CLIPS_POOL_MAX,
  type ClipFilterItem,
} from '../clip-filters';

function clip(overrides: Partial<FeedClip> = {}): FeedClip {
  return {
    id: 'clip-1',
    streamerId: 'streamer-1',
    externalClipId: 'SlugOne',
    title: 'A clip',
    url: 'https://clips.twitch.tv/SlugOne',
    thumbnailUrl: 'https://example.test/one.jpg',
    durationSeconds: 30,
    viewCount: 500,
    category: 'Just Chatting',
    clipCreatedAt: '2026-07-30T12:00:00Z',
    ...overrides,
  };
}

function item(overrides: Partial<ClipFilterItem> = {}): ClipFilterItem {
  return {
    id: 'clip-1',
    category: 'Just Chatting',
    language: 'en',
    languageLabel: 'English',
    ...overrides,
  };
}

/** Upper-cases the code so the tests never depend on CLDR data. */
const name = (code: string) => code.toUpperCase();

describe('buildClipFilterItems', () => {
  it('takes the language from the clip’s STREAMER, not the clip', () => {
    const items = buildClipFilterItems(
      [
        clip({ id: 'a', streamerId: 's1' }),
        clip({ id: 'b', streamerId: 's2', category: 'Fortnite' }),
      ],
      { s1: 'de', s2: 'ja' },
      name,
    );
    expect(items).toEqual([
      { id: 'a', category: 'Just Chatting', language: 'de', languageLabel: 'DE' },
      { id: 'b', category: 'Fortnite', language: 'ja', languageLabel: 'JA' },
    ]);
  });

  it('collapses regional variants onto the base tag', () => {
    const [pt] = buildClipFilterItems(
      [clip({ streamerId: 's1' })],
      { s1: 'pt-BR' },
      name,
    );
    expect(pt.language).toBe('pt');
    expect(pt.languageLabel).toBe('PT');
  });

  it('leaves unknown languages and missing categories blank', () => {
    const items = buildClipFilterItems(
      [
        clip({ id: 'a', streamerId: 'unmapped' }),
        clip({ id: 'b', streamerId: 's1', category: undefined }),
        clip({ id: 'c', streamerId: 's2', category: '  ' }),
      ],
      { s1: 'en', s2: 'en', unmapped: '' },
      name,
    );
    expect(items[0].language).toBe('');
    expect(items[0].languageLabel).toBe('');
    expect(items[1].category).toBe('');
    // Whitespace-only categories are blanked too — a filter option made of
    // spaces is indistinguishable from a broken label.
    expect(items[2].category).toBe('');
  });

  it('preserves the pool order, which the resting cut slices', () => {
    const items = buildClipFilterItems(
      [clip({ id: 'z' }), clip({ id: 'a' }), clip({ id: 'm' })],
      {},
      name,
    );
    expect(items.map((entry) => entry.id)).toEqual(['z', 'a', 'm']);
  });
});

describe('matchesClipFilters', () => {
  it('matches everything with no selection', () => {
    expect(matchesClipFilters(item({ category: '', language: '' }), '', '')).toBe(true);
  });

  it('requires every selected dimension to agree', () => {
    const target = item({ category: 'Fortnite', language: 'de' });
    expect(matchesClipFilters(target, 'Fortnite', 'de')).toBe(true);
    expect(matchesClipFilters(target, 'Fortnite', 'en')).toBe(false);
    expect(matchesClipFilters(target, 'Just Chatting', 'de')).toBe(false);
  });

  it('never matches a blank item against an explicit selection', () => {
    const unknown = item({ category: '', language: '' });
    expect(matchesClipFilters(unknown, 'Fortnite', '')).toBe(false);
    expect(matchesClipFilters(unknown, '', 'de')).toBe(false);
  });
});

describe('countClipFilterOptions', () => {
  const items = [
    item({ id: '1', category: 'Fortnite', language: 'de', languageLabel: 'DE' }),
    item({ id: '2', category: 'Fortnite', language: 'en', languageLabel: 'EN' }),
    item({ id: '3', category: 'Just Chatting', language: 'de', languageLabel: 'DE' }),
    item({ id: '4', category: '', language: '', languageLabel: '' }),
  ];

  it('counts categories, most first, skipping blanks', () => {
    expect(countClipFilterOptions(items, 'category')).toEqual([
      { value: 'Fortnite', label: 'Fortnite', count: 2 },
      { value: 'Just Chatting', label: 'Just Chatting', count: 1 },
    ]);
  });

  it('labels languages with the viewer-locale name it was given', () => {
    expect(countClipFilterOptions(items, 'language')).toEqual([
      { value: 'de', label: 'DE', count: 2 },
      { value: 'en', label: 'EN', count: 1 },
    ]);
  });
});

describe('computeVisibleClipIds', () => {
  const pool = Array.from({ length: 40 }, (_, index) =>
    item({
      id: `clip-${index}`,
      category: index % 2 === 0 ? 'Fortnite' : 'Just Chatting',
      language: index % 5 === 0 ? 'de' : 'en',
      languageLabel: index % 5 === 0 ? 'DE' : 'EN',
    }),
  );

  it('shows the resting cut when nothing is selected', () => {
    const visible = computeVisibleClipIds(pool, '', '', CLIPS_DEFAULT_VISIBLE);
    expect(visible.size).toBe(CLIPS_DEFAULT_VISIBLE);
    expect(visible.has('clip-0')).toBe(true);
    expect(visible.has(`clip-${CLIPS_DEFAULT_VISIBLE}`)).toBe(false);
  });

  it('reaches matches past the resting cut once a filter is active', () => {
    // clip-35 is German and ranks well beyond the 24-card cut — the whole
    // point of pooling 300 clips instead of showing a flat top 12.
    const visible = computeVisibleClipIds(pool, '', 'de', CLIPS_DEFAULT_VISIBLE);
    expect(visible.has('clip-35')).toBe(true);
    expect(visible.size).toBe(8);
  });

  it('intersects the two dimensions', () => {
    const visible = computeVisibleClipIds(pool, 'Fortnite', 'de', CLIPS_DEFAULT_VISIBLE);
    // Even indices are Fortnite, every fifth is German → 0, 10, 20, 30.
    expect([...visible].sort()).toEqual(['clip-0', 'clip-10', 'clip-20', 'clip-30']);
  });

  it('returns an empty set when nothing matches', () => {
    expect(computeVisibleClipIds(pool, 'Minecraft', '', CLIPS_DEFAULT_VISIBLE).size).toBe(0);
  });

  it('never shows more than the pool holds', () => {
    const tiny = pool.slice(0, 3);
    expect(computeVisibleClipIds(tiny, '', '', CLIPS_DEFAULT_VISIBLE).size).toBe(3);
  });
});

describe('pool constants', () => {
  it('keeps the resting cut inside the pool', () => {
    expect(CLIPS_DEFAULT_VISIBLE).toBeLessThan(HOME_CLIPS_POOL_MAX);
  });
});
