import { describe, expect, it } from 'vitest';
import type { PublicGame } from '../server/partner-api';
import { MIN_INDEXABLE_GAME_STREAMERS } from '../rankings';
import {
  buildGamesCollectionPageJsonLd,
  buildGamesHubFaq,
  buildGamesHubIntro,
  buildHubItemListEntries,
  DEFAULT_GAMES_HUB_VIEW,
  GAMES_HUB_VIEWS,
  gamesHubPath,
  gamesHubSegments,
  gamesHubUrl,
  gamesHubViewBySegment,
  HUB_ITEMLIST_LIMIT,
  isLikelyIndexableGame,
  MAX_HUB_DESC,
  MAX_HUB_TITLE,
  type GamesHubLiveStats,
  type GamesHubMetaStats,
} from '../games-hub';

function game(overrides: Partial<PublicGame> & { category: string }): PublicGame {
  return { streamer_count: 0, ...overrides };
}

const META: GamesHubMetaStats = { gameCount: 260, totalHours28d: 48_000 };
const LIVE: GamesHubLiveStats = { liveGameCount: 8, liveStreamerCount: 15 };

describe('view registry', () => {
  it('covers every sort mode exactly once', () => {
    expect(GAMES_HUB_VIEWS.map((v) => v.mode)).toEqual(['streamers', 'hours', 'trending']);
  });

  it('has exactly one root view (segment null) and it is the default', () => {
    const roots = GAMES_HUB_VIEWS.filter((v) => v.segment === null);
    expect(roots).toHaveLength(1);
    expect(DEFAULT_GAMES_HUB_VIEW).toBe(roots[0]);
  });

  it('segments are unique and URL-safe', () => {
    const segs = gamesHubSegments();
    expect(new Set(segs).size).toBe(segs.length);
    for (const s of segs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it('resolves known segments and rejects unknown ones', () => {
    expect(gamesHubViewBySegment('most-streamed')?.mode).toBe('hours');
    expect(gamesHubViewBySegment('trending')?.mode).toBe('trending');
    expect(gamesHubViewBySegment('nope')).toBeNull();
    // The root view must NOT be reachable at /games/<segment>.
    expect(gamesHubViewBySegment('')).toBeNull();
  });

  it('builds canonical paths and URLs', () => {
    expect(gamesHubPath(DEFAULT_GAMES_HUB_VIEW)).toBe('/games');
    expect(gamesHubUrl(DEFAULT_GAMES_HUB_VIEW)).toBe('https://streamertimes.tv/games');
    const hours = gamesHubViewBySegment('most-streamed')!;
    expect(gamesHubPath(hours)).toBe('/games/most-streamed');
    expect(gamesHubUrl(hours)).toBe('https://streamertimes.tv/games/most-streamed');
  });
});

describe('metadata copy', () => {
  // Cold aggregate + a single game: the degenerate end of every builder.
  const COLD: GamesHubMetaStats = { gameCount: 1, totalHours28d: null };

  for (const spec of GAMES_HUB_VIEWS) {
    describe(spec.mode, () => {
      it('title fits the SERP budget', () => {
        for (const stats of [META, COLD]) {
          expect(spec.buildTitle(stats).length).toBeLessThanOrEqual(MAX_HUB_TITLE);
        }
      });

      it('description fits the SERP budget', () => {
        for (const stats of [META, COLD]) {
          expect(spec.buildDescription(stats).length).toBeLessThanOrEqual(MAX_HUB_DESC);
        }
      });

      it('metadata never leaks volatile live numbers', () => {
        // The live figures must not appear in title/description at all —
        // metadata churn on every 10-min regeneration is the thing we are
        // avoiding. Guard by asserting the builders ignore them structurally:
        // they only accept GamesHubMetaStats, which has no live fields.
        const text = spec.buildTitle(META) + ' ' + spec.buildDescription(META);
        expect(text).not.toContain('live right now');
        expect(text).not.toMatch(/\b15\b/); // LIVE.liveStreamerCount
      });

      it('singularises a one-game catalog', () => {
        const text = spec.buildDescription(COLD);
        expect(text).toContain('1 game');
        expect(text).not.toContain('1 games');
      });

      it('title and h1 are distinct strings (no duplicate-copy penalty)', () => {
        expect(spec.buildTitle(META)).not.toBe(spec.h1);
      });
    });
  }

  it('every view has a unique title, h1 and description', () => {
    const titles = GAMES_HUB_VIEWS.map((v) => v.buildTitle(META));
    const h1s = GAMES_HUB_VIEWS.map((v) => v.h1);
    const descs = GAMES_HUB_VIEWS.map((v) => v.buildDescription(META));
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(h1s).size).toBe(h1s.length);
    expect(new Set(descs).size).toBe(descs.length);
  });

  it('no view claims watch time anywhere in its copy', () => {
    for (const spec of GAMES_HUB_VIEWS) {
      const all = [
        spec.h1,
        spec.navLabel,
        spec.crumb ?? '',
        spec.methodologyNote,
        spec.buildTitle(META),
        spec.buildDescription(META),
      ].join(' ');
      expect(all.toLowerCase()).not.toContain('most watched');
      expect(all.toLowerCase()).not.toContain('watch time');
    }
  });

  it('the hours view drops the hours clause when the aggregate is cold', () => {
    const hours = gamesHubViewBySegment('most-streamed')!;
    expect(hours.buildDescription({ gameCount: 260, totalHours28d: null })).not.toContain(
      'hours streamed in 28 days',
    );
    // and below the meaningfulness floor
    expect(hours.buildDescription({ gameCount: 260, totalHours28d: 4 })).not.toContain(
      'hours streamed in 28 days',
    );
    expect(hours.buildDescription({ gameCount: 260, totalHours28d: 48_000 })).toContain(
      'hours streamed in 28 days',
    );
  });
});

describe('isLikelyIndexableGame', () => {
  it('passes catalog rows at or above the streamer threshold', () => {
    expect(
      isLikelyIndexableGame(game({ category: 'A', streamer_count: MIN_INDEXABLE_GAME_STREAMERS })),
    ).toBe(true);
  });

  it('rejects thin rows with no live activity', () => {
    expect(
      isLikelyIndexableGame(
        game({ category: 'A', streamer_count: MIN_INDEXABLE_GAME_STREAMERS - 1 }),
      ),
    ).toBe(false);
  });

  it('live activity rescues a thin row (matches isGameHubIndexable)', () => {
    expect(
      isLikelyIndexableGame(game({ category: 'A', streamer_count: 1, live_streamer_count: 2 })),
    ).toBe(true);
  });

  it('treats a missing live_streamer_count as zero, not as truthy', () => {
    expect(isLikelyIndexableGame(game({ category: 'A', streamer_count: 1 }))).toBe(false);
    expect(
      isLikelyIndexableGame(game({ category: 'A', streamer_count: 1, live_streamer_count: 0 })),
    ).toBe(false);
  });
});

describe('buildHubItemListEntries', () => {
  const SORTED: PublicGame[] = [
    game({ category: 'Just Chatting', streamer_count: 40, top_streamers: [{ id: 'a', name: 'xQc', followers: 1 }] }),
    game({ category: 'Solarpunk', streamer_count: 1 }), // noindex — must be skipped
    game({ category: 'Rust', streamer_count: 2, live_streamer_count: 3 }), // live rescue
    game({ category: '???', streamer_count: 50 }), // slugs to '' — no hub URL
    game({ category: 'Valorant', streamer_count: 9 }),
  ];

  it('excludes noindex games so structured data never contradicts robots', () => {
    const out = buildHubItemListEntries(SORTED).map((e) => e.category);
    expect(out).not.toContain('Solarpunk');
  });

  it('keeps thin-but-live games (parity with the page-level gate)', () => {
    expect(buildHubItemListEntries(SORTED).map((e) => e.category)).toContain('Rust');
  });

  it('drops categories with no derivable slug', () => {
    expect(buildHubItemListEntries(SORTED).map((e) => e.category)).not.toContain('???');
  });

  it('preserves the caller-supplied order (mirrors the rendered grid)', () => {
    expect(buildHubItemListEntries(SORTED).map((e) => e.category)).toEqual([
      'Just Chatting',
      'Rust',
      'Valorant',
    ]);
  });

  it('caps the list, counting only the entries it kept', () => {
    // 30 indexable games interleaved with 30 thin ones: the cap must apply
    // AFTER filtering, else a run of thin rows would shrink the output.
    const many: PublicGame[] = [];
    for (let i = 0; i < 30; i++) {
      many.push(game({ category: `Thin ${i}`, streamer_count: 1 }));
      many.push(game({ category: `Big ${i}`, streamer_count: 20 }));
    }
    const out = buildHubItemListEntries(many);
    expect(out).toHaveLength(HUB_ITEMLIST_LIMIT);
    expect(out.every((e) => e.category.startsWith('Big'))).toBe(true);
  });

  it('respects an explicit limit', () => {
    expect(buildHubItemListEntries(SORTED, 2)).toHaveLength(2);
  });

  it('collects top-streamer names and tolerates missing ones', () => {
    const [jc, rust] = buildHubItemListEntries(SORTED);
    expect(jc.topStreamerNames).toEqual(['xQc']);
    expect(rust.topStreamerNames).toEqual([]);
  });
});

describe('buildGamesCollectionPageJsonLd', () => {
  const entries = buildHubItemListEntries([
    game({ category: 'Rust', streamer_count: 20, top_streamers: [{ id: 'a', name: 'Trymacs', followers: 1 }] }),
  ]);
  interface LdListItem {
    '@type': string;
    position: number;
    name: string;
    url: string;
    description?: string;
  }
  interface LdCollectionPage {
    '@context'?: string;
    '@type': string;
    url: string;
    dateModified: string;
    mainEntity: {
      '@context'?: string;
      '@type': string;
      numberOfItems: number;
      itemListElement: LdListItem[];
    };
  }

  const ld = buildGamesCollectionPageJsonLd({
    spec: DEFAULT_GAMES_HUB_VIEW,
    entries,
    description: 'desc',
    dateModified: new Date('2026-07-20T12:00:00.000Z'),
  }) as unknown as LdCollectionPage;

  it('is a CollectionPage whose mainEntity is the ItemList', () => {
    expect(ld['@type']).toBe('CollectionPage');
    expect(ld.mainEntity['@type']).toBe('ItemList');
  });

  it('declares exactly one @context, on the outer node only', () => {
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld.mainEntity['@context']).toBeUndefined();
  });

  it('numberOfItems matches the emitted elements', () => {
    expect(ld.mainEntity.numberOfItems).toBe(ld.mainEntity.itemListElement.length);
  });

  it('positions are 1-based and contiguous', () => {
    const positions = ld.mainEntity.itemListElement.map((e) => e.position);
    expect(positions).toEqual(positions.map((_, i) => i + 1));
  });

  it('points at absolute /game/<slug> URLs', () => {
    expect(ld.mainEntity.itemListElement[0].url).toBe('https://streamertimes.tv/game/rust');
  });

  it('serialises cleanly (no undefined leaks into the JSON)', () => {
    expect(JSON.stringify(ld)).not.toContain('undefined');
  });
});

describe('buildGamesHubIntro', () => {
  it('states the catalog size and the ordering', () => {
    const out = buildGamesHubIntro(DEFAULT_GAMES_HUB_VIEW, META, LIVE);
    expect(out).toContain('260 games');
    expect(out).toContain(DEFAULT_GAMES_HUB_VIEW.methodologyNote);
  });

  it('includes live numbers (unlike metadata)', () => {
    expect(buildGamesHubIntro(DEFAULT_GAMES_HUB_VIEW, META, LIVE)).toContain(
      '15 streamers are live right now',
    );
  });

  it('omits the live clause entirely when nothing is live', () => {
    const out = buildGamesHubIntro(DEFAULT_GAMES_HUB_VIEW, META, {
      liveGameCount: 0,
      liveStreamerCount: 0,
    });
    expect(out).not.toContain('live right now');
    expect(out).not.toContain('0 streamer');
  });

  it('singularises one live streamer in one category', () => {
    const out = buildGamesHubIntro(DEFAULT_GAMES_HUB_VIEW, META, {
      liveGameCount: 1,
      liveStreamerCount: 1,
    });
    // Scope to the live clause — the lead sentence legitimately contains
    // "categories" ("games and categories") and would mask a plural bug.
    expect(out).toContain('1 streamer is live right now across 1 category.');
  });

  it('drops the "across N categories" clause when that count is unknown', () => {
    const out = buildGamesHubIntro(DEFAULT_GAMES_HUB_VIEW, META, {
      liveGameCount: 0,
      liveStreamerCount: 5,
    });
    // Sentence ends right after the count — no dangling "across 0 categories".
    expect(out).toContain('5 streamers are live right now.');
    expect(out).not.toContain('across 0');
  });
});

describe('buildGamesHubFaq', () => {
  const TOP: PublicGame[] = [
    game({ category: 'Just Chatting', streamer_count: 40, hours_28d: 5000, trend_delta_percent: 12 }),
    game({ category: 'Rust', streamer_count: 22, hours_28d: 3000, trend_delta_percent: 8 }),
  ];

  it('always explains the ranking and the hours/watch-time distinction', () => {
    for (const spec of GAMES_HUB_VIEWS) {
      const qs = buildGamesHubFaq({ spec, meta: META, live: LIVE, topGames: TOP }).map((f) => f.q);
      expect(qs).toContain('How are these games ranked?');
      expect(qs).toContain('Does "hours streamed" mean watch time?');
    }
  });

  it('the watch-time answer is unambiguous', () => {
    const faq = buildGamesHubFaq({
      spec: DEFAULT_GAMES_HUB_VIEW,
      meta: META,
      live: LIVE,
      topGames: TOP,
    });
    const a = faq.find((f) => f.q.includes('watch time'))!.a;
    expect(a).toMatch(/^No\./);
    expect(a).toContain('not report viewer watch time');
  });

  it('leads with a view-specific superlative', () => {
    const byMode = Object.fromEntries(
      GAMES_HUB_VIEWS.map((spec) => [
        spec.mode,
        buildGamesHubFaq({ spec, meta: META, live: LIVE, topGames: TOP })[0].q,
      ]),
    );
    expect(byMode.streamers).toContain('most popular game');
    expect(byMode.hours).toContain('most streamed game');
    expect(byMode.trending).toContain('trending');
  });

  it('never fabricates a superlative when the metric is missing', () => {
    const hours = gamesHubViewBySegment('most-streamed')!;
    const faq = buildGamesHubFaq({
      spec: hours,
      meta: META,
      live: LIVE,
      topGames: [game({ category: 'Rust', streamer_count: 5 })], // no hours_28d
    });
    expect(faq.some((f) => f.q.includes('most streamed game'))).toBe(false);
  });

  it('emits no superlative at all for an empty catalog', () => {
    const faq = buildGamesHubFaq({
      spec: DEFAULT_GAMES_HUB_VIEW,
      meta: { gameCount: 0, totalHours28d: null },
      live: { liveGameCount: 0, liveStreamerCount: 0 },
      topGames: [],
    });
    // Only the two evergreen entries survive.
    expect(faq).toHaveLength(2);
    expect(faq.every((f) => f.a.length > 0)).toBe(true);
  });

  it('omits the live Q&A when nothing is live', () => {
    const faq = buildGamesHubFaq({
      spec: DEFAULT_GAMES_HUB_VIEW,
      meta: META,
      live: { liveGameCount: 0, liveStreamerCount: 0 },
      topGames: TOP,
    });
    expect(faq.some((f) => f.q === 'Who is streaming right now?')).toBe(false);
  });

  describe('trending superlative honesty', () => {
    const trending = gamesHubViewBySegment('trending')!;
    const lead = (delta: number) =>
      buildGamesHubFaq({
        spec: trending,
        meta: META,
        live: LIVE,
        topGames: [game({ category: 'Rust', streamer_count: 5, trend_delta_percent: delta })],
      })[0].a;

    it('claims growth only when the leader actually grew', () => {
      expect(lead(12)).toContain('12% more active streamers');
      expect(lead(12)).toContain('growing fastest');
    });

    it('never calls a declining leader "growing"', () => {
      const a = lead(-30);
      expect(a).not.toContain('growing fastest');
      expect(a).toContain('No category is growing right now');
      expect(a).toContain('down 30%');
      expect(a).not.toContain('-30'); // no double sign
    });

    it('handles a flat leader without claiming growth or decline', () => {
      const a = lead(0);
      expect(a).not.toContain('growing fastest');
      expect(a).not.toContain('down');
      expect(a).toContain('no category gained');
    });
  });

  it('produces no empty questions or answers in any configuration', () => {
    for (const spec of GAMES_HUB_VIEWS) {
      for (const topGames of [TOP, [], [game({ category: 'X', streamer_count: 0 })]]) {
        for (const live of [LIVE, { liveGameCount: 0, liveStreamerCount: 0 }]) {
          for (const meta of [META, { gameCount: 0, totalHours28d: null }]) {
            for (const f of buildGamesHubFaq({ spec, meta, live, topGames })) {
              expect(f.q.trim().length).toBeGreaterThan(0);
              expect(f.a.trim().length).toBeGreaterThan(0);
              expect(f.a).not.toContain('undefined');
              expect(f.a).not.toContain('NaN');
            }
          }
        }
      }
    }
  });
});
