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

/** Renderable banner URL. Twitch offline screens are fixed 1920x1080; YouTube
 *  bannerExternalUrl is a bare googleusercontent asset that serves a small
 *  default — append a width directive once (never twice). */
export function bannerDisplayUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https:\/\/yt3\.(googleusercontent|ggpht)\.com\//.test(url) && !url.includes('=')) {
    return `${url}=w1707`;
  }
  return url;
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

/** Minutes → "3.5 h" style duration per viewer locale (one decimal, trimmed). */
export function formatHours(minutes: number, uiLang: string): string {
  const hours = new Intl.NumberFormat(intlLocale(uiLang), { maximumFractionDigits: 1 }).format(
    minutes / 60,
  );
  return `${hours} h`;
}
