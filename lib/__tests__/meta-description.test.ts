// Regression guard for Bing Webmaster Tools' "Meta Description too long or too
// short" (25–160 characters). On 2026-08-01 it flagged /game/fortnite at 227;
// a prod sweep showed every game hub, every rankings page, /app,
// /best-games-to-stream and /game/*/best-time were between 165 and 241 — the
// streamer pages were the only class enforcing a budget (lib/seo.ts MAX_DESC).
//
// These tests cover the pure builders. The page-level `generateMetadata`
// templates that are not extractable (game hub, best-time, climbers) are
// asserted through the same helper they now use: `pickMetaDescription` can
// never return more than MAX_META_DESCRIPTION, so covering the helper plus the
// registry builders keeps the whole surface honest.

import { describe, expect, it } from 'vitest';
import {
  clampMetaDescription,
  MAX_META_DESCRIPTION,
  pickMetaDescription,
} from '@/lib/seo';
import { RANKING_PAGES } from '@/lib/rankings';
import { GAMES_HUB_VIEWS } from '@/lib/games-hub';
import { siteMetaFor } from '@/lib/i18n-sitemeta';
import { UI_LANGS } from '@/lib/i18n-core';
import type { PublicRankingEntry, PublicStreamer } from '@/lib/server/partner-api';

// Bing's own upper bound. Our budget sits below it on purpose.
const BING_MAX = 160;
const BING_MIN = 25;

function streamer(name: string): PublicStreamer {
  return {
    id: name.toLowerCase(),
    name,
    platforms: ['twitch'],
    avatar_url: null,
    is_featured: false,
    timezone: null,
    twitch_login: name.toLowerCase(),
    youtube_channel_id: null,
    description: null,
    description_en: null,
    language: 'en',
    follower_count: 19_200_000,
    updated_at: '2026-08-01T00:00:00Z',
    last_status_change_at: null,
  } as unknown as PublicRankingEntry['streamer'];
}

function entry(name: string): PublicRankingEntry {
  return {
    rank: 1,
    streamer: streamer(name),
    values: {
      follower_count: 19_200_000,
      follower_gain_7d: 240_000,
      avg_view_count: 42_000,
      hours_streamed_28d: 186.5,
      time_hit_rate: 0.92,
      streams_per_week: 5,
      avg_stream_duration_minutes: 245,
    },
  } as unknown as PublicRankingEntry;
}

// A name long enough to blow any budget on its own — the case that used to
// produce a mid-word cut instead of a shorter, whole sentence.
const ABSURD_NAME = 'A'.repeat(120);

describe('pickMetaDescription', () => {
  it('returns the first candidate that fits', () => {
    const rich = 'x'.repeat(MAX_META_DESCRIPTION + 1);
    const lean = 'The lean fallback sentence.';
    expect(pickMetaDescription(rich, lean)).toBe(lean);
  });

  it('prefers the richest candidate when it fits', () => {
    expect(pickMetaDescription('Rich copy.', 'Lean copy.')).toBe('Rich copy.');
  });

  it('clamps when no candidate fits, rather than returning an oversized string', () => {
    const only = 'y '.repeat(200);
    const out = pickMetaDescription(only);
    expect(out.length).toBeLessThanOrEqual(MAX_META_DESCRIPTION);
    expect(out.endsWith('…')).toBe(true);
  });

  it('collapses whitespace so a blank template slot cannot double a space', () => {
    expect(pickMetaDescription('Ninja leads.  Live now.')).toBe('Ninja leads. Live now.');
  });

  it('never exceeds the budget for any candidate set', () => {
    for (const len of [0, 1, 50, 154, 155, 156, 400]) {
      expect(pickMetaDescription('z'.repeat(len)).length).toBeLessThanOrEqual(
        MAX_META_DESCRIPTION,
      );
    }
  });
});

describe('clampMetaDescription', () => {
  it('leaves an in-budget description byte-identical', () => {
    const text = 'Ninja leads the Fortnite ranking. Who is live now on Twitch and YouTube.';
    expect(clampMetaDescription(text)).toBe(text);
  });

  it('stays inside Bing’s limit', () => {
    expect(MAX_META_DESCRIPTION).toBeLessThanOrEqual(BING_MAX);
  });
});

describe('ranking page descriptions', () => {
  it.each(RANKING_PAGES.map((p) => [p.slug, p] as const))(
    '%s fits the budget with and without a leader',
    (_slug, spec) => {
      for (const top of [undefined, entry('Ninja'), entry(ABSURD_NAME)]) {
        const desc = spec.buildDescription(top);
        expect(desc.length).toBeLessThanOrEqual(MAX_META_DESCRIPTION);
        expect(desc.length).toBeGreaterThanOrEqual(BING_MIN);
      }
    },
  );

  it('drops the leader clause instead of truncating an absurd name', () => {
    for (const spec of RANKING_PAGES) {
      expect(spec.buildDescription(entry(ABSURD_NAME))).not.toContain('…');
    }
  });

  // The whole point of the lead is that it makes each leaderboard's snippet
  // unique. Shortening the evergreen sentences to fit the budget is only
  // correct as long as a realistically long streamer name still leaves room —
  // otherwise every ranking would silently fall back to identical copy.
  it.each(RANKING_PAGES.map((p) => [p.slug, p] as const))(
    '%s keeps the leader clause for a realistically long name',
    (_slug, spec) => {
      expect(spec.buildDescription(entry('AdmiralBulldog_TV'))).toMatch(
        /AdmiralBulldog_TV/,
      );
    },
  );
});

describe('games hub view descriptions', () => {
  it.each(GAMES_HUB_VIEWS.map((v) => [v.mode, v] as const))(
    '%s fits the budget across cold and warm stats',
    (_mode, view) => {
      for (const stats of [
        { gameCount: 0, totalHours28d: null },
        { gameCount: 428, totalHours28d: 1_284_000 },
        { gameCount: 12_345, totalHours28d: 99_999_999 },
      ]) {
        const desc = view.buildDescription(stats as Parameters<typeof view.buildDescription>[0]);
        expect(desc.length).toBeLessThanOrEqual(MAX_META_DESCRIPTION);
        expect(desc.length).toBeGreaterThanOrEqual(BING_MIN);
      }
    },
  );
});

// The hub lexicon's own header has always asked for "descriptions ≤ 160 chars
// where feasible"; by 2026-08-01 fifteen of the sixty entries had drifted to
// 162-189. Only en+de are indexable today (INDEXABLE_HUB_LOCALES), but M22 P4
// widens that to all twelve — assert the whole lexicon so the widening cannot
// ship a dozen new Bing warnings with it.
describe('localized hub metadata lexicon', () => {
  it.each(UI_LANGS.map((l) => [l] as const))('%s stays inside the budget', (locale) => {
    const meta = siteMetaFor(locale);
    for (const [page, entry] of Object.entries(meta)) {
      expect(
        entry.description.length,
        `${locale}.${page} description is ${entry.description.length} chars`,
      ).toBeLessThanOrEqual(MAX_META_DESCRIPTION);
      expect(entry.description.length).toBeGreaterThanOrEqual(BING_MIN);
    }
  });
});
