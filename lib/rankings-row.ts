// Wire shape of ONE leaderboard row.
//
// Why this exists: the /rankings hub renders its Top-5 previews on the server
// (SEO), but a filtered preview is fetched from /api/rankings/filter and
// rendered in the browser. Both must produce the same markup, so both feed the
// same presentational component (components/web/RankingRowsTable.tsx) — and
// that component can only be shared if a row carries no server-only
// dependencies: no metric registry (its `format` functions can't cross the
// wire), no hub lexicon (server-only module), no Set/Map.
//
// Everything a row displays is therefore resolved HERE, on the server:
// formatted metric values, the localized language name, the trend title, the
// avatar URL already right-sized. The client only renders.
//
// `toRankingRow` is pure and unit-tested (lib/__tests__/rankings-row.test.ts).

import type { Platform, PublicRankingEntry, PublicStreamSlot } from '@/lib/server/partner-api';
import type { HubLex } from '@/lib/i18n-hub';
import type { RankingColumn } from '@/lib/rankings';
import { rankTrend } from '@/lib/rankings';
import { languageDisplayName } from '@/lib/format/language';
import { sizedAvatarUrl } from '@/lib/format/image-size';
import { localeHref, type UiLang } from '@/lib/i18n-core';

/** Avatar render size in CSS px — must match the <Image> width/height. */
export const RANKING_AVATAR_PX = 36;

/** Week-over-week movement badge next to the rank. */
export type RankingRowTrend =
  | { kind: 'up' | 'down'; delta: number; title: string }
  | { kind: 'new'; label: string; title: string };

/** "Next stream" cell: a 24/7 channel, a concrete slot, or nothing. */
export type RankingRowNextStream =
  | { kind: 'always-on'; title: string }
  | {
      kind: 'slot';
      startTime: string;
      isPredicted: boolean;
      /** Announced/predicted game of THAT stream; null for cancelled slots. */
      category: string | null;
    };

export interface RankingRowDto {
  /** ABSOLUTE position in the (unfiltered) ranking — see toRankingRow. */
  rank: number;
  streamerId: string;
  name: string;
  /** Locale-aware /streamer/<id> href. */
  href: string;
  /** Already passed through sizedAvatarUrl; null → initials avatar. */
  avatarUrl: string | null;
  platforms: Platform[];
  /** Localized broadcaster-language name; null when unknown. */
  languageLabel: string | null;
  isLive: boolean;
  /** Formatted metric values, index-aligned with the table's headers. */
  values: string[];
  trend: RankingRowTrend | null;
  /** Main game cell; `href` null when the category has no ranking page. */
  mainGame: { label: string; href: string | null; title: string } | null;
  nextStream: RankingRowNextStream | null;
}

export interface RankingRowContext {
  columns: RankingColumn[];
  lex: HubLex['rankings'];
  locale: UiLang;
  /** Ids that are live right now; omit to render no LIVE badges. */
  liveIds?: ReadonlySet<string>;
  /** Earliest upcoming slot per streamer; omit to render no next-stream cell. */
  nextSlots?: ReadonlyMap<string, PublicStreamSlot>;
  /** category → /rankings/game/ slug; omit to render no main-game cell. */
  mainGameSlugs?: ReadonlyMap<string, string>;
}

/**
 * Projects one API entry into its rendered row.
 *
 * The rank is taken from the entry as-is and never renumbered per view: it is
 * the streamer's absolute position in the full ranking, which is what the "#"
 * column of a leaderboard means and what keeps `values.previous_rank` (and
 * therefore the trend arrow) comparable. A filtered preview consequently shows
 * the real ranks of its five rows (e.g. #12, #43, #88) rather than a made-up
 * 1..5.
 */
export function toRankingRow(
  entry: PublicRankingEntry,
  ctx: RankingRowContext,
): RankingRowDto {
  const { streamer } = entry;
  return {
    rank: entry.rank,
    streamerId: streamer.id,
    name: streamer.name,
    href: localeHref(ctx.locale, `/streamer/${encodeURIComponent(streamer.id)}`),
    avatarUrl: sizedAvatarUrl(streamer.avatar_url, RANKING_AVATAR_PX),
    platforms: streamer.platforms,
    languageLabel: languageDisplayName(streamer.language, ctx.locale),
    isLive: ctx.liveIds?.has(streamer.id) ?? false,
    values: ctx.columns.map((col) => col.format(entry)),
    trend: toRowTrend(entry, ctx.lex),
    mainGame: ctx.mainGameSlugs
      ? toMainGame(entry, ctx.mainGameSlugs, ctx.lex, ctx.locale)
      : null,
    nextStream: ctx.nextSlots
      ? toNextStream(streamer.is_always_on, ctx.nextSlots.get(streamer.id), ctx.lex)
      : null,
  };
}

/** Column headers in the table's own order, localized where the lexicon knows them. */
export function toRankingHeaders(
  columns: RankingColumn[],
  lex: HubLex['rankings'],
): { label: string; primary: boolean }[] {
  return columns.map((col) => ({
    // Keyed by the registry's English header; an unknown header falls back to
    // English instead of crashing.
    label: lex.tableHeaders[col.header] ?? col.header,
    primary: col.primary === true,
  }));
}

function toRowTrend(
  entry: PublicRankingEntry,
  lex: HubLex['rankings'],
): RankingRowTrend | null {
  const trend = rankTrend(entry);
  if (trend.kind === 'none') return null;
  if (trend.kind === 'new') {
    return { kind: 'new', label: lex.trendNewLabel, title: lex.trendNewTitle };
  }
  return {
    kind: trend.kind,
    delta: trend.delta,
    title: lex.trendMoveTitle(trend.kind === 'up', trend.delta),
  };
}

function toMainGame(
  entry: PublicRankingEntry,
  slugs: ReadonlyMap<string, string>,
  lex: HubLex['rankings'],
  locale: UiLang,
): RankingRowDto['mainGame'] {
  const top = entry.top_category;
  if (!top) return null;
  const slug = slugs.get(top.category);
  return {
    label: top.category,
    // Categories outside the games list render as plain text — the
    // /rankings/game/[slug] route 404s for them.
    href: slug ? localeHref(locale, `/rankings/game/${slug}`) : null,
    title: lex.mainGameShareTitle(top.share_percent),
  };
}

function toNextStream(
  isAlwaysOn: boolean,
  slot: PublicStreamSlot | undefined,
  lex: HubLex['rankings'],
): RankingRowNextStream | null {
  if (isAlwaysOn) return { kind: 'always-on', title: lex.alwaysOnTitle };
  if (!slot) return null;
  return {
    kind: 'slot',
    startTime: slot.start_time,
    isPredicted: slot.is_predicted,
    // A game name on a cancelled slot would be misleading.
    category: slot.slot_kind === 'cancelled' ? null : slot.category,
  };
}
