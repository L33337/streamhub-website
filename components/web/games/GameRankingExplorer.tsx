'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  filterGameRankingRows,
  gameRankingLanguages,
  sortGameRankingRows,
  type GameRankingRow,
  type GameRankingSortMode,
} from '@/lib/game-ranking';
import { sizedAvatarUrl } from '@/lib/format/image-size';
import { formatCompactNumber } from '@/lib/format/number';
import { languageDisplayName } from '@/lib/format/language';
import { formatHours } from '@/lib/rankings';
import { localeHref, resolveUiLang } from '@/lib/i18n-core';
import { LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { NextStreamTime } from '@/components/web/NextStreamTime';

/**
 * Server-resolved strings (M22 P4). The hub lexicon is server-only, so the
 * page resolves these and passes them down — never import i18n-hub here.
 * Entries marked "template" carry {n}/{value}/{share} placeholders replaced
 * client-side (values only exist per row).
 */
export interface GameRankingExplorerLabels {
  sortAria: string;
  sortFollowers: string;
  sortHours: string;
  sortViewers: string;
  filterLangAria: string;
  allChip: string;
  noMatch: string;
  /** Full caption sentence incl. the category name (pre-interpolated). */
  tableCaption: string;
  thRank: string;
  thStreamer: string;
  thFollowers: string;
  thAvgViewers: string;
  thHours: string;
  thShare: string;
  thShareTitle: string;
  thNextStream: string;
  liveNowCell: string;
  /** " · {value} watching" */
  watchingTail: string;
  trendNewBadge: string;
  trendNewTitle: string;
  /** "Up {n} since last week" */
  trendUpTemplate: string;
  trendDownTemplate: string;
  /** "Main game: {share}% of their recent broadcasts" */
  mainGameTemplate: string;
}

// Medal accents for ranks 1-3 — same palette as RankingTable.
const MEDAL_CLASSES: Record<number, string> = {
  1: 'text-[#FFC94D]',
  2: 'text-[#C7CEDD]',
  3: 'text-[#C9885A]',
};

/** ▲2 / ▼1 / NEW — only meaningful next to the canonical follower rank. */
function TrendIndicator({
  row,
  labels,
}: {
  row: GameRankingRow;
  labels: GameRankingExplorerLabels;
}) {
  if (row.isNew) {
    return (
      <span
        className="text-[9px] font-bold uppercase tracking-wider text-accent-cyan"
        title={labels.trendNewTitle}
      >
        {labels.trendNewBadge}
      </span>
    );
  }
  if (row.rankDelta == null || row.rankDelta === 0) return null;
  const up = row.rankDelta > 0;
  const template = up ? labels.trendUpTemplate : labels.trendDownTemplate;
  return (
    <span
      className={`text-[10px] font-semibold tabular-nums ${up ? 'text-live' : 'text-accent-pink'}`}
      title={template.replace('{n}', String(Math.abs(row.rankDelta)))}
    >
      {up ? '▲' : '▼'}
      {Math.abs(row.rankDelta)}
    </span>
  );
}

/**
 * Interactive depth ranking table for /rankings/game/[slug]: client-side sort
 * toggle + language filter over the server-fetched rows. SSR renders the
 * default view (canonical follower order, no filter), so the crawlable HTML
 * matches the initial client view — same pattern as GamesExplorer.
 */
export function GameRankingExplorer({
  rows,
  locale,
  labels,
}: {
  rows: GameRankingRow[];
  /** Viewer locale (M22 P4): number formatting + streamer-link prefixes. */
  locale: string;
  labels: GameRankingExplorerLabels;
}) {
  const [mode, setMode] = useState<GameRankingSortMode>('followers');
  const [language, setLanguage] = useState<string | null>(null);
  const uiLang = resolveUiLang(locale);

  const languages = useMemo(() => gameRankingLanguages(rows), [rows]);
  const visible = useMemo(
    () => sortGameRankingRows(filterGameRankingRows(rows, language), mode),
    [rows, language, mode],
  );

  const SORT_OPTIONS: { mode: GameRankingSortMode; label: string }[] = [
    { mode: 'followers', label: labels.sortFollowers },
    { mode: 'hours', label: labels.sortHours },
    { mode: 'viewers', label: labels.sortViewers },
  ];

  // Row anchors + trend arrows only in the canonical (SSR-identical) view:
  // positions are stable there, and the 7d delta refers to the follower rank.
  const canonical = mode === 'followers' && language === null;

  const hasHours = rows.some((r) => r.hours28d != null);
  const hasShare = rows.some((r) => r.sharePercent != null);
  const hasNext = rows.some((r) => r.nextStreamAt != null || r.isLive);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label={labels.sortAria}
          className="flex overflow-hidden rounded-lg border border-border-default"
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setMode(opt.mode)}
              aria-pressed={mode === opt.mode}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === opt.mode
                  ? 'bg-accent-cyan/20 text-accent-cyan'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {languages.length > 0 && (
          <div
            role="group"
            aria-label={labels.filterLangAria}
            className="flex flex-wrap gap-1.5"
          >
            <button
              type="button"
              onClick={() => setLanguage(null)}
              aria-pressed={language === null}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                language === null
                  ? 'border-accent-cyan/60 font-semibold text-accent-cyan'
                  : 'border-border-default text-text-secondary hover:text-text-primary'
              }`}
            >
              {labels.allChip}
            </button>
            {languages.map(({ code, count }) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(language === code ? null : code)}
                aria-pressed={language === code}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  language === code
                    ? 'border-accent-cyan/60 font-semibold text-accent-cyan'
                    : 'border-border-default text-text-secondary hover:text-text-primary'
                }`}
              >
                {languageDisplayName(code, uiLang) ?? code}{' '}
                <span className="text-text-muted">({count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-text-muted">{labels.noMatch}</p>
      ) : (
        // Frame and scroll container split on purpose: gradient-border's
        // absolute ::before scrolls with the content when it sits on the
        // overflow element, cutting its right edge through the table
        // mid-scroll (see RankingRowsTable).
        <div className="mt-4 rounded-xl bg-background-elevated p-1 gradient-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{labels.tableCaption}</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    {labels.thRank}
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    {labels.thStreamer}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    {labels.thFollowers}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    {labels.thAvgViewers}
                  </th>
                  {hasHours && (
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      {labels.thHours}
                    </th>
                  )}
                  {hasShare && (
                    <th
                      scope="col"
                      className="px-3 py-2 text-right font-semibold"
                      title={labels.thShareTitle}
                    >
                      {labels.thShare}
                    </th>
                  )}
                  {hasNext && (
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      {labels.thNextStream}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const medal = MEDAL_CLASSES[row.rank];
                  return (
                    <tr
                      key={row.id}
                      id={canonical ? `rank-${row.rank}` : undefined}
                      className="scroll-mt-20 border-t border-divider"
                    >
                      <td className="px-3 py-2">
                        <span className="flex items-baseline gap-1.5">
                          <span
                            className={`font-bold tabular-nums ${medal ?? 'text-text-muted'}`}
                          >
                            {row.rank}
                          </span>
                          {canonical && <TrendIndicator row={row} labels={labels} />}
                        </span>
                      </td>
                      <th scope="row" className="px-3 py-2 text-left font-medium">
                        <Link
                          href={localeHref(uiLang, `/streamer/${encodeURIComponent(row.id)}`)}
                          className="group flex items-center gap-3"
                        >
                          {row.avatarUrl ? (
                            <Image
                              src={sizedAvatarUrl(row.avatarUrl, 36)}
                              alt={row.name}
                              width={36}
                              height={36}
                              unoptimized
                              className="shrink-0 rounded-full border border-border-default"
                            />
                          ) : (
                            <InitialsAvatar name={row.name} size={36} className="shrink-0" />
                          )}
                          <span className="flex min-w-0 flex-col">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-semibold text-text-primary group-hover:text-accent-cyan">
                                {row.name}
                              </span>
                              {row.isLive && <LiveBadge />}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              {row.platforms.map((p) => (
                                <PlatformBadge key={p} platform={p} size="sm" />
                              ))}
                              {row.language && (
                                <span className="text-[10px] tracking-wider text-text-muted">
                                  {languageDisplayName(row.language, uiLang)}
                                </span>
                              )}
                            </span>
                          </span>
                        </Link>
                      </th>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-accent-cyan">
                        {formatCompactNumber(row.followerCount, uiLang)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                        {row.avgViewCount != null && row.avgViewCount > 0
                          ? formatCompactNumber(row.avgViewCount, uiLang)
                          : '—'}
                      </td>
                      {hasHours && (
                        <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                          {row.hours28d != null && row.hours28d > 0
                            ? formatHours(row.hours28d, uiLang)
                            : '—'}
                        </td>
                      )}
                      {hasShare && (
                        <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                          {row.sharePercent != null ? (
                            <span
                              className={
                                row.sharePercent >= 75
                                  ? 'font-semibold text-text-primary'
                                  : undefined
                              }
                              title={
                                row.sharePercent >= 75
                                  ? labels.mainGameTemplate.replace(
                                      '{share}',
                                      String(row.sharePercent),
                                    )
                                  : undefined
                              }
                            >
                              {row.sharePercent}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                      {hasNext && (
                        <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-text-secondary">
                          {row.isLive ? (
                            <span className="font-semibold text-live">
                              {labels.liveNowCell}
                              {row.liveViewerCount != null &&
                                labels.watchingTail.replace(
                                  '{value}',
                                  formatCompactNumber(row.liveViewerCount, uiLang),
                                )}
                            </span>
                          ) : row.nextStreamAt ? (
                            <span className="flex flex-col items-end leading-tight">
                              <NextStreamTime
                                startTime={row.nextStreamAt}
                                isPredicted={row.nextIsPredicted}
                                language={uiLang}
                              />
                              {row.nextCategory && (
                                <span
                                  className="mt-0.5 max-w-[9rem] truncate text-[11px] text-text-muted"
                                  title={row.nextCategory}
                                >
                                  {row.nextCategory}
                                </span>
                              )}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
