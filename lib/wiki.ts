// M26 streamer wiki: pure logic for the /streamer/[slug]/wiki page.
// Everything here is unit-tested (lib/__tests__/wiki.test.ts) — the page
// component only renders.
//
// Locale note (M22 D6): fact VALUES arrive language-neutral from the API
// (ISO codes, USD numbers, enum keys); the formatters below turn them into
// the VIEWER's locale. The article is content (EN source / native
// translation) and is picked by pickWikiArticle, never reformatted.

import type {
  PublicGame,
  PublicGamePlacement,
  PublicRecapListItem,
  PublicStreamer,
  PublicStreamerStats,
  PublicStreamerStatsCategory,
  PublicStreamerWiki,
  StreamerInsights,
  WikiArticle,
  WikiChange,
  WikiFact,
  WikiHistoryEntry,
  WikiLink,
  WikiTimelineEntry,
} from '@/lib/server/partner-api';
import { gameSlug } from '@/lib/game-slug';
import { gameRankingHref, MIN_POOL_SIZE } from '@/lib/streamer-rankings';
import { COLLECTING_THRESHOLD, followerStats } from '@/lib/streamer-insights';

/** Infobox render order: identity → person → career → money. Unknown keys
 *  (a future, newer API) are ignored by orderedWikiFacts. */
export const WIKI_FACT_ORDER: readonly string[] = [
  'real_name',
  'birth_date',
  'birthplace',
  'residence',
  'nationality',
  'height_cm',
  'relationship_status',
  'career_start',
  'teams',
  'net_worth_usd',
  'est_income_monthly_usd',
];

/** BCP-47 tags for Intl formatting per UI locale (site convention: pt = pt-BR). */
const INTL_LOCALE: Record<string, string> = {
  en: 'en-US',
  pt: 'pt-BR',
};

export function intlLocale(uiLang: string): string {
  return INTL_LOCALE[uiLang] ?? uiLang;
}

/** Known facts in stable render order; unknown/future keys are dropped. */
export function orderedWikiFacts(facts: WikiFact[]): WikiFact[] {
  const byKey = new Map(facts.map((f) => [f.key, f]));
  const out: WikiFact[] = [];
  for (const key of WIKI_FACT_ORDER) {
    const fact = byKey.get(key);
    if (fact) out.push(fact);
  }
  return out;
}

// ============================================
// Footnote markers
// ============================================

export type ParagraphSegment =
  | { type: 'text'; text: string }
  | { type: 'ref'; n: number };

const MARKER_RE = /\[(\d{1,2})\]/g;

/**
 * Splits a paragraph into text segments and [n] footnote references so the
 * renderer can turn refs into #source-n links. Out-of-range refs (defensive —
 * the API already validates) render as plain text.
 */
export function splitFootnotes(paragraph: string, sourceCount: number): ParagraphSegment[] {
  const out: ParagraphSegment[] = [];
  let last = 0;
  for (const m of paragraph.matchAll(MARKER_RE)) {
    const n = Number(m[1]);
    if (n < 1 || n > sourceCount) continue;
    // Trim the space BEFORE a marker ("text [1]" -> "text[1]") so the sup
    // hugs the sentence like on Wikipedia.
    const before = paragraph.slice(last, m.index).replace(/ $/, '');
    if (before.length > 0) out.push({ type: 'text', text: before });
    out.push({ type: 'ref', n });
    last = (m.index ?? 0) + m[0].length;
  }
  const rest = paragraph.slice(last);
  if (rest.length > 0) out.push({ type: 'text', text: rest });
  return out.length > 0 ? out : [{ type: 'text', text: paragraph }];
}

// ============================================
// Value formatting
// ============================================

/** Exact age for full birth dates; null for year-only values (an off-by-one
 *  age would be worse than none — the year alone is still shown). */
export function displayAge(birthDate: string, now: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const d = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const anniversary = new Date(Date.UTC(now.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (now < anniversary) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** 'YYYY-MM-DD' → locale long date; 'YYYY' passes through. */
export function formatBirthDate(value: string, uiLang: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(intlLocale(uiLang), {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(d);
}

/** Compact USD amount/range for the viewer locale: "$3M–$5M" / "3–5 Mio. $". */
export function formatUsdRange(low: number, high: number | null, uiLang: string): string {
  const fmt = new Intl.NumberFormat(intlLocale(uiLang), {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  if (high !== null && high > low) {
    return `${fmt.format(low)}–${fmt.format(high)}`;
  }
  return fmt.format(low);
}

// ISO 3166-1 user-assigned ranges (AA, QM–QZ, XA–XZ, ZZ): ICU "resolves"
// these to "Unknown Region" instead of failing — treat them as unknown.
const USER_ASSIGNED_REGION = /^(AA|Q[M-Z]|X[A-Z]|ZZ)$/;

/** Localized country name from an ISO alpha-2 code; falls back to the code. */
export function formatRegion(code: string, uiLang: string): string {
  if (USER_ASSIGNED_REGION.test(code)) return code;
  try {
    return new Intl.DisplayNames([intlLocale(uiLang)], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** ISO timestamp → locale long date (for "Updated <date>"). */
export function formatWikiDate(iso: string, uiLang: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(uiLang), {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(d);
}

// ============================================
// Images (M26 image round, 2026-08-18)
// ============================================

// Twitch avatars are stored as ...-profile_image-300x300.png; the CDN serves
// the same asset in fixed sizes (50/70/150/300/600). Swap to the largest —
// never invent sizes outside the known set.
//
// Relationship to lib/format/image-size.ts: sizedAvatarUrl() deliberately
// never asks for MORE than the stored URL names (its cap protects small
// circles from 298 KB downloads). The wiki portrait is the one layout that
// legitimately wants the biggest existing variant — the CDN serves 600x600
// for every profile image even though the stored URL names 300x300 (verified
// 2026-08-18). This helper is that documented "future layout asks for a
// bigger size" case; do not funnel small avatars through it.
const TWITCH_AVATAR_RE = /^(https:\/\/static-cdn\.jtvnw\.net\/jtv_user_pictures\/.+-profile_image-)\d+x\d+(\.\w+)$/;
// YouTube avatars carry an =sNN size param (yt3.googleusercontent.com/...=s176-c-...).
const YT_AVATAR_RE = /^(https:\/\/yt3\.(?:googleusercontent|ggpht)\.com\/[^=]+=)s\d+(.*)$/;

/** Largest known variant of a channel avatar for the infobox portrait / OG
 *  image. Unknown URL shapes pass through unchanged. */
export function avatarLargeUrl(url: string | null): string | null {
  if (!url) return null;
  const twitch = url.match(TWITCH_AVATAR_RE);
  if (twitch) return `${twitch[1]}600x600${twitch[2]}`;
  const yt = url.match(YT_AVATAR_RE);
  if (yt) return `${yt[1]}s600${yt[2]}`;
  return url;
}

// ============================================
// Responsive banner + portrait (perf round, 2026-09-19)
// ============================================
//
// The wiki hero and portrait render as plain <img srcSet sizes> — `next/image`
// with `unoptimized` emits no srcset, and a `loader` function cannot cross the
// RSC boundary. Measured 2026-09-18 (timthetatman, mobile Slow 4G): the hero
// alone was a 583 KB 1920x1080 PNG painted into a 412x128 box; images were
// 708 of 1331 KiB per page load. Both CDNs resize through the URL, so the
// candidates below are pure string rewrites. Unknown shapes degrade to a
// single `src` (today's behaviour), never to a broken URL — the same contract
// as lib/format/image-size.ts.

export interface ImageSources {
  /** Fallback for browsers without srcset support; also the preload target. */
  src: string;
  /** `w`-descriptor candidate list, or null when only `src` is known. */
  srcSet: string | null;
  /** Layout hint for the browser's candidate pick; null without srcSet. */
  sizes: string | null;
  /** Intrinsic dimensions of `src` (aspect-ratio hint for the box). */
  width: number;
  height: number;
}

// Twitch offline screens: `…-channel_offline_image-1920x1080.png` plus the
// legacy `…-channel_offline_image-<hash>-1920x1080.jpeg` form. Unlike profile
// images (fixed buckets) these accept ARBITRARY 16:9 sizes via the suffix —
// verified 2026-09-19 for every URL shape in the database (1280x720 = 198 KB,
// 1024x576 = 116 KB, 640x360 = 38 KB). Asking for MORE than stored distorts
// (3840x2160 came back as 2560x2160), hence the ≤ stored-width filter. Only
// the offline-image path is matched on purpose: a profile image would 404 on
// these widths.
const TWITCH_BANNER_RE =
  /^(https:\/\/static-cdn\.jtvnw\.net\/jtv_user_pictures\/\S*channel_offline_image-\S*?)(\d+)x(\d+)(\.(?:png|jpe?g))$/;
const TWITCH_BANNER_WIDTHS = [640, 828, 1024, 1280, 1920] as const;
/** The hero is at most 992 CSS px wide (max-w-5xl minus padding); below lg it
 *  spans the viewport. */
export const BANNER_SIZES = '(min-width: 1024px) 992px, 100vw';

// YouTube channel banners arrive "bare" (no `=` directive) and serve a small
// default. The old `=w1707` weighed 618–645 KB — heavier than the Twitch PNG.
// YouTube's own desktop crop directive returns the 6:1 safe area (the part
// banners are designed for) as JPEG: 1280 wide = 81–125 KB. The widths are
// YouTube's own 1x/2x desktop banner sizes.
const YT_BANNER_HOST_RE = /^https:\/\/yt3\.(?:googleusercontent|ggpht)\.com\//;
const YT_BANNER_WIDTHS = [1060, 1280, 2120, 2560] as const;
const YT_BANNER_CROP = '-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj';
/** Crop height per width: rows 0x5a57..0xa5a8 of a 16:9 source. */
const YT_BANNER_CROP_RATIO = ((0xa5a8 - 0x5a57) / 0xffff) * (9 / 16);
/** The 6:1 image is `object-cover`-scaled to the box HEIGHT on phones (128 px
 *  high → ~770 CSS px effective width), so the hint stays at the desktop width
 *  instead of `100vw` — a viewport-based pick would fetch a too-small file. */
export const YT_BANNER_SIZES = '992px';

function srcSetOf(candidates: ReadonlyArray<{ url: string; w: number }>): string {
  return candidates.map((c) => `${c.url} ${c.w}w`).join(', ');
}

/** Largest candidate not above `cap`, else the smallest available. */
function pickFallback<T extends { w: number }>(candidates: readonly T[], cap: number): T {
  const under = candidates.filter((c) => c.w <= cap);
  return under.length > 0 ? under[under.length - 1] : candidates[0];
}

/**
 * Responsive sources for the channel-banner hero. Null for no banner; a
 * single-`src` result (no srcSet) for YouTube URLs that already carry a
 * directive and for hosts we do not know.
 */
export function bannerSources(url: string | null): ImageSources | null {
  if (!url) return null;

  const twitch = url.match(TWITCH_BANNER_RE);
  if (twitch) {
    const storedW = Number(twitch[2]);
    const storedH = Number(twitch[3]);
    if (storedW > 0 && storedH > 0) {
      const candidates = TWITCH_BANNER_WIDTHS.filter((w) => w <= storedW).map((w) => ({
        w,
        url: `${twitch[1]}${w}x${Math.max(1, Math.round((storedH / storedW) * w))}${twitch[4]}`,
      }));
      if (candidates.length > 0) {
        const fallback = pickFallback(candidates, 1280);
        return {
          src: fallback.url,
          srcSet: srcSetOf(candidates),
          sizes: BANNER_SIZES,
          width: fallback.w,
          height: Math.max(1, Math.round((storedH / storedW) * fallback.w)),
        };
      }
    }
    // Stored smaller than the smallest candidate (theoretical): serve as is.
    return { src: url, srcSet: null, sizes: null, width: storedW, height: storedH };
  }

  if (YT_BANNER_HOST_RE.test(url) && !url.includes('=')) {
    const candidates = YT_BANNER_WIDTHS.map((w) => ({ w, url: `${url}=w${w}${YT_BANNER_CROP}` }));
    const fallback = pickFallback(candidates, 1280);
    return {
      src: fallback.url,
      srcSet: srcSetOf(candidates),
      sizes: YT_BANNER_SIZES,
      width: fallback.w,
      height: Math.max(1, Math.round(fallback.w * YT_BANNER_CROP_RATIO)),
    };
  }

  // YouTube with an existing directive, or an unknown host: unchanged, with
  // the 16:9 attributes the hero always carried.
  return { src: url, srcSet: null, sizes: null, width: 1920, height: 1080 };
}

/** Infobox portrait box: w-40 / sm:w-48 / lg:w-56. */
export const PORTRAIT_SIZES = '(min-width: 1024px) 224px, (min-width: 640px) 192px, 160px';
// Twitch profile images exist only in fixed buckets (see image-size.ts); the
// 600 bucket is served for every avatar even though the stored URL names 300
// (the avatarLargeUrl rule). Anything else 404s, so no other widths.
const TWITCH_PORTRAIT_WIDTHS = [150, 300, 600] as const;
// YouTube serves any `=s<N>`: measured 2026-09-18 s320 = 43 KB, s448 = 69 KB,
// s600 = 110 KB for the same avatar.
const YT_PORTRAIT_WIDTHS = [224, 320, 448, 600] as const;

/**
 * Responsive sources for the infobox portrait (square). `src` is the middle
 * candidate as the no-srcset fallback; OG image + JSON-LD keep avatarLargeUrl
 * (a single 600 px file is right there).
 */
export function avatarSources(url: string | null): ImageSources | null {
  if (!url) return null;
  const twitch = url.match(TWITCH_AVATAR_RE);
  if (twitch) {
    const candidates = TWITCH_PORTRAIT_WIDTHS.map((w) => ({
      w,
      url: `${twitch[1]}${w}x${w}${twitch[2]}`,
    }));
    return {
      src: candidates[1].url,
      srcSet: srcSetOf(candidates),
      sizes: PORTRAIT_SIZES,
      width: candidates[1].w,
      height: candidates[1].w,
    };
  }
  const yt = url.match(YT_AVATAR_RE);
  if (yt) {
    const candidates = YT_PORTRAIT_WIDTHS.map((w) => ({ w, url: `${yt[1]}s${w}${yt[2]}` }));
    return {
      src: candidates[2].url,
      srcSet: srcSetOf(candidates),
      sizes: PORTRAIT_SIZES,
      width: candidates[2].w,
      height: candidates[2].w,
    };
  }
  return { src: url, srcSet: null, sizes: null, width: 600, height: 600 };
}

export interface WikiTopGame {
  category: string;
  slug: string;
  boxArtUrl: string;
  /** Integer 0-100: this category's share of the streamer's categorized
   *  streams in the stats window. */
  sharePercent: number;
}

/**
 * The streamer's top categories joined against the games catalog: only
 * categories with a real game hub AND box art become tiles (YouTube bucket
 * categories and unresolved games drop out naturally). Order follows the
 * stats ranking.
 */
export function wikiTopGames(
  categories: PublicStreamerStatsCategory[],
  games: PublicGame[],
  limit = 3,
): WikiTopGame[] {
  if (categories.length === 0 || games.length === 0) return [];
  const byCategory = new Map(games.map((g) => [g.category, g]));
  const out: WikiTopGame[] = [];
  for (const entry of categories) {
    if (out.length >= limit) break;
    const game = byCategory.get(entry.category);
    if (!game?.box_art_url) continue;
    const slug = gameSlug(game.category);
    if (slug.length === 0) continue;
    out.push({
      category: game.category,
      slug,
      boxArtUrl: game.box_art_url,
      sharePercent: entry.share_percent,
    });
  }
  return out;
}

/** "54 %" / "54%" per viewer locale, from the integer 0-100 share. */
export function formatSharePercent(sharePercent: number, uiLang: string): string {
  return new Intl.NumberFormat(intlLocale(uiLang), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(sharePercent / 100);
}

// ============================================
// Article pick + meta description
// ============================================

/**
 * Article for a viewer locale — the pickDescription rule applied to wiki
 * content: the native translation only when the viewer reads that language,
 * the EN source for everyone else. `lang` drives the lang attribute of the
 * article body.
 */
export function pickWikiArticle(
  wiki: Pick<PublicStreamerWiki, 'article' | 'article_native' | 'native_lang'>,
  viewerLocale: string,
): { article: WikiArticle; lang: string } {
  if (wiki.article_native && wiki.native_lang && viewerLocale === wiki.native_lang) {
    return { article: wiki.article_native, lang: wiki.native_lang };
  }
  return { article: wiki.article, lang: 'en' };
}

/** Meta description from the article summary: hard 160-char budget, cut at a
 *  word boundary with an ellipsis. */
export function wikiMetaDescription(summary: string): string {
  const clean = summary.replace(/\s+/g, ' ').trim();
  if (clean.length <= 160) return clean;
  const cut = clean.slice(0, 157);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : 157)}…`;
}

// ============================================
// Title parts (W1, 2026-09-18)
// ============================================

export type WikiTitlePart = 'age' | 'netWorth' | 'earnings' | 'realName' | 'career' | 'facts';

/** Fact key → title part, in the order the title lists them. */
const TITLE_PERSONAL_PARTS: ReadonlyArray<readonly [string, WikiTitlePart]> = [
  ['birth_date', 'age'],
  ['net_worth_usd', 'netWorth'],
  ['est_income_monthly_usd', 'earnings'],
  ['real_name', 'realName'],
];

/** How many personal parts the title carries before the fixed tail. */
const TITLE_MAX_PERSONAL_PARTS = 2;

/**
 * Title building blocks derived from the facts that EXIST: up to two personal
 * parts (age, net worth, earnings, real name — in that order) followed by
 * "career", or "career" + "facts" when the profile carries no personal
 * fact at all. The old static "Age, Net Worth & Facts" promised an age and a
 * net worth on profiles that had neither (2 of the 5 pilots).
 */
export function wikiTitleParts(facts: ReadonlyArray<Pick<WikiFact, 'key'>>): WikiTitlePart[] {
  const keys = new Set(facts.map((f) => f.key));
  const personal = TITLE_PERSONAL_PARTS.filter(([key]) => keys.has(key))
    .map(([, part]) => part)
    .slice(0, TITLE_MAX_PERSONAL_PARTS);
  return personal.length > 0 ? [...personal, 'career'] : ['career', 'facts'];
}

/** "a, b & c" with locale separator/conjunction; 1 label passes through. */
export function joinTitleParts(labels: readonly string[], sep: string, and: string): string {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(sep)}${and}${labels[labels.length - 1]}`;
}

/** The model-computed income fact when it carries a numeric range, else null
 *  (the earnings fallback sentence needs a formattable number). */
export function incomeFact(facts: readonly WikiFact[]): WikiFact | null {
  return (
    facts.find((f) => f.key === 'est_income_monthly_usd' && f.value_num_low !== null) ?? null
  );
}

// ============================================
// Own-data sections (W2, 2026-09-18)
// ============================================

export interface WikiNumbers {
  followers: number | null;
  /** Insights overall median; null while the sample count is below the collecting threshold. */
  medianViewers: number | null;
  peakViewers: number | null;
  streamsPerWeek: number | null;
  activeDays: number | null;
  typicalMinutes: number | null;
  hoursStreamed: number | null;
  /** Stats window the activity numbers describe (28 by default). */
  windowDays: number;
  followerGain30: number | null;
}

/**
 * Headline numbers for the "By the numbers" tiles. Every source is optional
 * (a failed or empty lookup nulls its tiles); returns null when NOTHING is
 * known so the section disappears instead of rendering an empty grid.
 */
export function wikiNumbers(
  streamer: Pick<PublicStreamer, 'follower_count'> | null,
  stats: PublicStreamerStats | null,
  insights: StreamerInsights | null,
): WikiNumbers | null {
  const collecting = (insights?.sample_count ?? 0) < COLLECTING_THRESHOLD;
  const num = (v: number | null | undefined): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;
  const out: WikiNumbers = {
    followers: num(streamer?.follower_count),
    medianViewers: collecting ? null : num(insights?.overall_median),
    peakViewers: num(stats?.peak_viewer_count),
    streamsPerWeek: num(stats?.streams_per_week),
    activeDays: num(stats?.active_days_per_week),
    typicalMinutes: num(stats?.typical_duration_minutes),
    hoursStreamed: num(stats?.hours_streamed),
    windowDays: stats?.window_days ?? 28,
    followerGain30: num(followerStats(insights?.follower_trend)?.gain30),
  };
  const known = Object.entries(out).some(([k, v]) => k !== 'windowDays' && v !== null);
  return known ? out : null;
}

export interface WikiGameRow {
  category: string;
  /** Hub link slug — only for categories in the games catalog (a page exists). */
  slug: string | null;
  boxArtUrl: string | null;
  streams: number;
  sharePercent: number;
  /** Follower rank inside the category, when the backend reports a meaningful placement. */
  rank: number | null;
  total: number | null;
  rankHref: string | null;
}

/**
 * Games table: EVERY top category of the stats window (the old tile row kept
 * only hub games with box art), joined with the catalog for links/box art and
 * with the per-game ranking placements. Order = stats ranking (share desc).
 */
export function wikiGamesTable(
  categories: readonly PublicStreamerStatsCategory[],
  games: readonly PublicGame[],
  placements: readonly PublicGamePlacement[],
  limit = 8,
): WikiGameRow[] {
  if (categories.length === 0) return [];
  const byCategory = new Map(games.map((g) => [g.category, g]));
  const placementBy = new Map(
    placements
      .filter(
        (p) =>
          Number.isInteger(p.rank) &&
          p.rank >= 1 &&
          Number.isInteger(p.total) &&
          p.total >= MIN_POOL_SIZE &&
          p.rank <= p.total,
      )
      .map((p) => [p.category, p]),
  );
  const out: WikiGameRow[] = [];
  for (const entry of categories) {
    if (out.length >= limit) break;
    if (!entry.category) continue;
    const game = byCategory.get(entry.category) ?? null;
    const slug = game ? gameSlug(game.category) : '';
    const placement = placementBy.get(entry.category) ?? null;
    out.push({
      category: entry.category,
      slug: slug.length > 0 ? slug : null,
      boxArtUrl: game?.box_art_url ?? null,
      streams: entry.streams,
      sharePercent: entry.share_percent,
      rank: placement?.rank ?? null,
      total: placement?.total ?? null,
      rankHref: placement ? gameRankingHref(entry.category, placement.rank) : null,
    });
  }
  return out;
}

/** Recap editions listing the streamer among their hero protagonists. */
export function wikiRecapMentions(
  items: readonly PublicRecapListItem[],
  streamerId: string,
  limit = 6,
): PublicRecapListItem[] {
  return items
    .filter((item) => item.hero?.streamers?.some((s) => s.id === streamerId) === true)
    .slice(0, limit);
}

/** Monday-first short weekday labels in the viewer locale (UTC calendar, like
 *  the chart's cells). 2024-01-01 is a Monday. */
export function weekdayShortLabels(uiLang: string): string[] {
  const fmt = new Intl.DateTimeFormat(intlLocale(uiLang), { weekday: 'short', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
}

/** ISO date/timestamp → short "Aug 10" style label per viewer locale (UTC). */
export function formatWikiShortDate(iso: string, uiLang: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(uiLang), {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

// ============================================
// W3 (2026-09-18): timeline + official links
// ============================================

const TIMELINE_DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/** Defensive read of the article timeline: valid dates + text only,
 *  chronological (the API already sorts; string order matches). */
export function wikiTimeline(article: Pick<WikiArticle, 'timeline'>): WikiTimelineEntry[] {
  return (article.timeline ?? [])
    .filter(
      (t) =>
        typeof t?.date === 'string' &&
        TIMELINE_DATE_RE.test(t.date) &&
        typeof t.text === 'string' &&
        t.text.trim().length > 0,
    )
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * 'YYYY' → "2021", 'YYYY-MM' → "September 2021", 'YYYY-MM-DD' → long date,
 * per viewer locale (UTC calendar). Malformed input passes through.
 */
export function formatTimelineDate(date: string, uiLang: string): string {
  if (!TIMELINE_DATE_RE.test(date)) return date;
  if (date.length === 4) return date;
  const d = new Date(`${date.length === 7 ? `${date}-01` : date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat(intlLocale(uiLang), {
    ...(date.length === 7 ? { month: 'long', year: 'numeric' } : { dateStyle: 'long' }),
    timeZone: 'UTC',
  }).format(d);
}

/** Display labels of the link platforms (proper names, not translated). An
 *  unknown platform from a newer API falls back to its raw key. */
export const WIKI_LINK_LABELS: Record<string, string> = {
  x: 'X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitch: 'Twitch',
  kick: 'Kick',
  discord: 'Discord',
  facebook: 'Facebook',
  bluesky: 'Bluesky',
  threads: 'Threads',
};

export function wikiLinkLabel(platform: string): string {
  return WIKI_LINK_LABELS[platform] ?? platform;
}

/** https links only (the API allow-lists hosts; this is the client's belt). */
export function wikiLinks(wiki: Pick<PublicStreamerWiki, 'links'>): WikiLink[] {
  return (wiki.links ?? []).filter(
    (l) => typeof l?.url === 'string' && l.url.startsWith('https://') && typeof l.platform === 'string',
  );
}

// ============================================
// W4 (2026-09-18): monthly history
// ============================================

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Defensive read of the history: valid month keys, one row per month,
 *  newest first (the API already orders; a pre-W4 API has no field). */
export function wikiHistory(wiki: Pick<PublicStreamerWiki, 'history'>): WikiHistoryEntry[] {
  const seen = new Set<string>();
  return (wiki.history ?? [])
    .filter(
      (h) =>
        typeof h?.month === 'string' &&
        MONTH_KEY_RE.test(h.month) &&
        typeof h.streams === 'number' &&
        typeof h.generated_at === 'string',
    )
    .filter((h) => (seen.has(h.month) ? false : (seen.add(h.month), true)))
    .sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
}

export interface WikiHistoryYear {
  year: string;
  entries: WikiHistoryEntry[];
}

/** Newest year first, entries keep their (newest-first) order. */
export function groupHistoryByYear(entries: WikiHistoryEntry[]): WikiHistoryYear[] {
  const groups: WikiHistoryYear[] = [];
  for (const entry of entries) {
    const year = entry.month.slice(0, 4);
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.entries.push(entry);
    else groups.push({ year, entries: [entry] });
  }
  return groups;
}

/** 'YYYY-MM' → "Aug 2026" per viewer locale (table cell, so the short form). */
export function formatHistoryMonth(month: string, uiLang: string): string {
  if (!MONTH_KEY_RE.test(month)) return month;
  return new Intl.DateTimeFormat(intlLocale(uiLang), {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00Z`));
}

/** The paragraph on the content axis: the streamer-language text when the
 *  viewer reads that language (same rule as pickWikiArticle), else EN. */
export function historyParagraph(
  entry: Pick<WikiHistoryEntry, 'paragraph' | 'paragraph_native'>,
  viewerLocale: string,
  nativeLang: string | null,
): { text: string; lang: string } | null {
  if (entry.paragraph_native && nativeLang && viewerLocale === nativeLang) {
    return { text: entry.paragraph_native, lang: nativeLang };
  }
  if (entry.paragraph) return { text: entry.paragraph, lang: 'en' };
  return null;
}

/** Newest `generated_at` across the rows (feeds ProfilePage.dateModified). */
export function latestHistoryIso(entries: Pick<WikiHistoryEntry, 'generated_at'>[]): string | null {
  let best: string | null = null;
  for (const e of entries) {
    const t = new Date(e.generated_at).getTime();
    if (Number.isNaN(t)) continue;
    if (best === null || t > new Date(best).getTime()) best = e.generated_at;
  }
  return best;
}

/** Later of two ISO timestamps (null-tolerant), for dateModified. */
export function laterIso(a: string, b: string | null): string {
  if (!b) return a;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(tb)) return a;
  if (Number.isNaN(ta)) return b;
  return tb > ta ? b : a;
}

/** "+3,594" / "−120" per viewer locale; empty for null. */
export function formatSignedInt(value: number | null, uiLang: string): string {
  if (value === null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat(intlLocale(uiLang), {
    signDisplay: 'exceptZero',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Whole-number formatting per viewer locale (hours, viewers). */
export function formatWholeNumber(value: number | null, uiLang: string): string {
  if (value === null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat(intlLocale(uiLang), { maximumFractionDigits: 0 }).format(value);
}

// ============================================
// W5 (2026-09-18): change log
// ============================================

export const WIKI_CHANGE_KINDS = [
  'fact_added',
  'fact_changed',
  'fact_removed',
  'section_updated',
  'income_refreshed',
] as const;

/** Article parts a `section_updated` entry can name (API contract). */
export const WIKI_SECTION_KEYS = [
  'summary',
  'career',
  'content_style',
  'community',
  'awards',
  'personal_life',
  'earnings',
  'timeline',
  'links',
] as const;

/** Defensive read: known kinds with a parseable timestamp, newest first. */
export function wikiChanges(wiki: Pick<PublicStreamerWiki, 'changes'>): WikiChange[] {
  return (wiki.changes ?? [])
    .filter(
      (c) =>
        typeof c?.changed_at === 'string' &&
        !Number.isNaN(new Date(c.changed_at).getTime()) &&
        (WIKI_CHANGE_KINDS as readonly string[]).includes(c.kind) &&
        typeof c.key === 'string' &&
        c.key.length > 0,
    )
    .slice()
    .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
}

export interface WikiChangeDay {
  /** 'YYYY-MM-DD' (UTC) */
  day: string;
  /** Newest timestamp of the day, for formatting. */
  iso: string;
  facts: WikiChange[];
  /** Section keys rewritten that day, in WIKI_SECTION_KEYS order, deduped. */
  sections: string[];
}

/** Groups (newest-first) changes by UTC day: fact/income entries stay
 *  individual lines, section rewrites collapse into one list per day. */
export function groupChangesByDay(changes: WikiChange[]): WikiChangeDay[] {
  const days: WikiChangeDay[] = [];
  for (const change of changes) {
    const day = change.changed_at.slice(0, 10);
    let group = days[days.length - 1];
    if (!group || group.day !== day) {
      group = { day, iso: change.changed_at, facts: [], sections: [] };
      days.push(group);
    }
    if (change.kind === 'section_updated') {
      if (!group.sections.includes(change.key)) group.sections.push(change.key);
    } else {
      group.facts.push(change);
    }
  }
  const order = WIKI_SECTION_KEYS as readonly string[];
  for (const group of days) {
    group.sections.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }
  return days;
}

/** Minutes → "3.5 h" style duration per viewer locale (one decimal, trimmed). */
export function formatHours(minutes: number, uiLang: string): string {
  const hours = new Intl.NumberFormat(intlLocale(uiLang), { maximumFractionDigits: 1 }).format(
    minutes / 60,
  );
  return `${hours} h`;
}

// ============================================
// UX round (2026-09-18): clip gate, date labels, prose links, teaser
// ============================================

/** A clip below this many views is not a "notable moment". */
export const NOTABLE_CLIP_MIN_VIEWS = 100;
/** Fewer qualifying clips than this and the section hides (a lone tile in a
 *  three-column grid reads as a broken section). */
export const NOTABLE_CLIPS_MIN_COUNT = 3;

/**
 * Quality gate for the "Notable moments" section. The API returns a
 * streamer's top clips by views, which for smaller channels meant tiles with
 * 5–9 views under a "most watched" heading (audit 2026-09-18: 2 of 5 pilots).
 * Keeps the API order; returns [] when too few clips clear the floor.
 */
export function wikiNotableClips<T extends { view_count: number | null }>(
  clips: readonly T[],
  minViews = NOTABLE_CLIP_MIN_VIEWS,
  minCount = NOTABLE_CLIPS_MIN_COUNT,
): T[] {
  const kept = clips.filter((c) => typeof c.view_count === 'number' && c.view_count >= minViews);
  return kept.length >= minCount ? kept : [];
}

/**
 * Infobox "as of" label: a fact's `as_of` arrives at source precision
 * ('YYYY' | 'YYYY-MM' | 'YYYY-MM-DD'). Rendered at MONTH precision at most:
 * the raw ISO day next to "Married" read like a wedding date, and the day of
 * the source article is not a property of the fact. Unknown shapes pass through.
 */
export function formatFactAsOf(asOf: string, uiLang: string): string {
  if (!TIMELINE_DATE_RE.test(asOf)) return asOf;
  return formatTimelineDate(asOf.slice(0, 7), uiLang);
}

/** Source "published" label at its own precision, per viewer locale; free
 *  text from the API (e.g. "n.d.") passes through unchanged. */
export function formatSourceDate(published: string, uiLang: string): string {
  return formatTimelineDate(published.trim(), uiLang);
}

export interface GameLinkTarget {
  name: string;
  slug: string;
}

// Catalog categories that are ordinary words or YouTube's coarse video
// buckets. Never auto-linked from prose: "Music" at the start of a sentence
// is not a mention of the Twitch category. (A name list is fine HERE because
// not linking is the safe side; aggregations must filter by platform.)
const GENERIC_CATEGORY_NAMES = new Set(
  [
    'Gaming',
    'Entertainment',
    'News & Politics',
    'People & Blogs',
    'Sports',
    'Music',
    'Travel & Events',
    'Science & Technology',
    'Film & Animation',
    'Art',
    'Chess',
    'Poker',
    'Slots',
    'IRL',
    'ASMR',
    'Politics',
    'Special Events',
    'Just Chatting',
    'Always On',
    'Software and Game Development',
    'Games + Demos',
  ].map((n) => n.toLowerCase()),
);

const GAME_LINK_MIN_LENGTH = 4;

/**
 * Link targets for game mentions in article prose: catalog games (a hub page
 * exists) minus generic names, longest first so "Counter-Strike 2" wins over
 * "Counter-Strike". Slug collisions keep the first catalog entry.
 */
export function gameLinkTargets(games: readonly Pick<PublicGame, 'category'>[]): GameLinkTarget[] {
  const seen = new Set<string>();
  const out: GameLinkTarget[] = [];
  for (const g of games) {
    const name = g.category?.trim();
    if (!name || name.length < GAME_LINK_MIN_LENGTH) continue;
    if (GENERIC_CATEGORY_NAMES.has(name.toLowerCase())) continue;
    const slug = gameSlug(name);
    if (slug.length === 0 || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, slug });
  }
  return out.sort((a, b) => b.name.length - a.name.length || (a.name < b.name ? -1 : 1));
}

export type ProseSegment =
  | { type: 'text'; text: string }
  | { type: 'game'; text: string; slug: string };

const WORD_CHAR_RE = /[\p{L}\p{N}]/u;

/**
 * Splits prose into text and game-link segments. Case-sensitive whole-word
 * matches only (proper nouns; "overwatch" as a verb never links), and each
 * game links ONCE per page: `linked` is the caller's page-wide set of slugs
 * already linked, mutated here (Wikipedia's first-mention rule — a paragraph
 * naming Marvel Rivals seven times must not turn cyan).
 */
export function linkGameMentions(
  text: string,
  targets: readonly GameLinkTarget[],
  linked: Set<string>,
): ProseSegment[] {
  if (targets.length === 0 || text.length === 0) return [{ type: 'text', text }];
  // Earliest match wins; on a tie the longer name (targets are longest-first).
  const hits: Array<{ start: number; end: number; slug: string }> = [];
  for (const t of targets) {
    if (linked.has(t.slug)) continue;
    let from = 0;
    while (from <= text.length - t.name.length) {
      const i = text.indexOf(t.name, from);
      if (i < 0) break;
      const before = i > 0 ? text[i - 1] : '';
      const after = text[i + t.name.length] ?? '';
      const bounded = !WORD_CHAR_RE.test(before) && !WORD_CHAR_RE.test(after);
      const overlaps = hits.some((h) => i < h.end && i + t.name.length > h.start);
      if (bounded && !overlaps) {
        hits.push({ start: i, end: i + t.name.length, slug: t.slug });
        break; // first mention of THIS game only
      }
      from = i + 1;
    }
  }
  if (hits.length === 0) return [{ type: 'text', text }];
  hits.sort((a, b) => a.start - b.start);
  const out: ProseSegment[] = [];
  let last = 0;
  for (const h of hits) {
    if (linked.has(h.slug)) continue; // two names sharing a slug
    if (h.start > last) out.push({ type: 'text', text: text.slice(last, h.start) });
    out.push({ type: 'game', text: text.slice(h.start, h.end), slug: h.slug });
    linked.add(h.slug);
    last = h.end;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

/**
 * Teaser subtitle parts for the streamer page's wiki card: the SAME
 * fact-derived parts as the wiki <title>, joined with the locale's
 * separators and sentence-cased (most locales keep their title parts
 * lowercase because they follow a colon there; here they open the line).
 */
export function wikiTeaserParts(
  facts: ReadonlyArray<Pick<WikiFact, 'key'>>,
  labels: Record<WikiTitlePart, string>,
  sep: string,
  and: string,
  uiLang: string,
): string {
  const joined = joinTitleParts(
    wikiTitleParts(facts).map((p) => labels[p]),
    sep,
    and,
  );
  if (joined.length === 0) return joined;
  const [first] = Array.from(joined);
  return first.toLocaleUpperCase(intlLocale(uiLang)) + joined.slice(first.length);
}

export type ArticleSegment = ParagraphSegment | { type: 'game'; text: string; slug: string };

/**
 * One article paragraph as render segments: footnote refs split out first,
 * then game mentions linked inside the text runs. `linked` is the page-wide
 * first-mention set — call this in DOCUMENT order (summary, then the sections
 * top to bottom) before rendering, never from inside a component.
 */
export function articleSegments(
  paragraph: string,
  sourceCount: number,
  targets: readonly GameLinkTarget[],
  linked: Set<string>,
): ArticleSegment[] {
  const out: ArticleSegment[] = [];
  for (const seg of splitFootnotes(paragraph, sourceCount)) {
    if (seg.type === 'ref') out.push(seg);
    else out.push(...linkGameMentions(seg.text, targets, linked));
  }
  return out;
}
