import type { PublicRankingEntry, PublicStreamSlot } from '@/lib/server/partner-api';
import type { RankingColumn } from '@/lib/rankings';
import { toRankingHeaders, toRankingRow } from '@/lib/rankings-row';
import { RankingRowsTable } from '@/components/web/RankingRowsTable';
import type { UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';

interface Props {
  /** sr-only table caption, e.g. "Streamers ranked by follower count". */
  caption: string;
  /** Metric value columns (rendered right-aligned after the streamer cell). */
  columns: RankingColumn[];
  entries: PublicRankingEntry[];
  /**
   * When set, each row gets id="{prefix}-{rank}" so positions are deep-linkable
   * (e.g. /rankings/most-followed#rank-42). Leave unset on pages that render
   * several tables (the hub) — the ids would collide.
   */
  rowAnchorPrefix?: string;
  /**
   * Ids of streamers that are live right now (getLiveStreamerIdSet). When
   * provided, live rows get a LIVE badge next to the name. Callers must run
   * on a page whose revalidate keeps the set reasonably fresh (≤300 s — the
   * /streamers convention); omit on pages that only revalidate hourly.
   */
  liveIds?: Set<string>;
  /**
   * Earliest upcoming slot per streamer id (lib/server/next-streams.ts). When
   * provided, a "Next stream" column is appended: announced or predicted (~)
   * start in the viewer's local time, "24/7" for always-on channels, "—" when
   * nothing is scheduled within the fetch window.
   */
  nextSlots?: Map<string, PublicStreamSlot>;
  /**
   * category → /rankings/game/ slug for every game with a hub page. When
   * provided, a "Main game" column is appended from each entry's
   * `top_category`; categories without a hub page render as plain text (the
   * game-ranking route 404s for categories outside the games list).
   */
  mainGameSlugs?: Map<string, string>;
  /**
   * M22 S4.1: localizes the table chrome (headers, badge titles) and keeps
   * streamer/game links in the viewer's locale tree. Server component, so the
   * hub lexicon is read directly. Column VALUES keep their registry-owned
   * English number formatting. Default 'en' keeps the en-only /rankings/*
   * metric pages byte-identical.
   */
  locale?: UiLang;
}

/**
 * Server-side entry point for the leaderboard tables on /rankings and
 * /rankings/<metric>: resolves the hub lexicon, projects API entries into
 * rendered rows (lib/rankings-row.ts) and hands both to the shared
 * presentational table.
 *
 * The split exists because the /rankings hub also renders FILTERED previews in
 * the browser, from rows fetched via /api/rankings/filter — those go straight
 * to RankingRowsTable. Keep display logic there, not here, or the two paths
 * drift apart.
 */
export function RankingTable({
  caption,
  columns,
  entries,
  rowAnchorPrefix,
  liveIds,
  nextSlots,
  mainGameSlugs,
  locale = 'en',
}: Props) {
  const lex = hubLexFor(locale).rankings;
  return (
    <RankingRowsTable
      chrome={{
        caption,
        headers: toRankingHeaders(columns, lex),
        tableColStreamer: lex.tableColStreamer,
        mainGameHeader: mainGameSlugs ? lex.tableColMainGame : undefined,
        nextStreamHeader: nextSlots ? lex.tableColNextStream : undefined,
      }}
      rows={entries.map((entry) =>
        toRankingRow(entry, { columns, lex, locale, liveIds, nextSlots, mainGameSlugs }),
      )}
      rowAnchorPrefix={rowAnchorPrefix}
      locale={locale}
    />
  );
}
