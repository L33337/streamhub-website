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
  PublicStreamerStatsCategory,
  PublicStreamerWiki,
  WikiArticle,
  WikiFact,
} from '@/lib/server/partner-api';
import { gameSlug } from '@/lib/game-slug';

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
