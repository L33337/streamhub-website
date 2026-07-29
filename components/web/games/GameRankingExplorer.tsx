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
import { formatCompactNumber } from '@/lib/format/number';
import { languageDisplayName } from '@/lib/format/language';
import { formatHours } from '@/lib/rankings';
import { LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { NextStreamTime } from '@/components/web/NextStreamTime';

const SORT_OPTIONS: { mode: GameRankingSortMode; label: string }[] = [
  { mode: 'followers', label: 'Most followed' },
  { mode: 'hours', label: 'Most hours (28d)' },
  { mode: 'viewers', label: 'Most watched' },
];

// Medal accents for ranks 1-3 — same palette as RankingTable.
const MEDAL_CLASSES: Record<number, string> = {
  1: 'text-[#FFC94D]',
  2: 'text-[#C7CEDD]',
  3: 'text-[#C9885A]',
};

/** ▲2 / ▼1 / NEW — only meaningful next to the canonical follower rank. */
function TrendIndicator({ row }: { row: GameRankingRow }) {
  if (row.isNew) {
    return (
      <span
        className="text-[9px] font-bold uppercase tracking-wider text-accent-cyan"
        title="Not in this ranking a week ago"
      >
        new
      </span>
    );
  }
  if (row.rankDelta == null || row.rankDelta === 0) return null;
  const up = row.rankDelta > 0;
  return (
    <span
      className={`text-[10px] font-semibold tabular-nums ${up ? 'text-live' : 'text-accent-pink'}`}
      title={`${up ? 'Up' : 'Down'} ${Math.abs(row.rankDelta)} since last week`}
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
  category,
}: {
  rows: GameRankingRow[];
  category: string;
}) {
  const [mode, setMode] = useState<GameRankingSortMode>('followers');
  const [language, setLanguage] = useState<string | null>(null);

  const languages = useMemo(() => gameRankingLanguages(rows), [rows]);
  const visible = useMemo(
    () => sortGameRankingRows(filterGameRankingRows(rows, language), mode),
    [rows, language, mode],
  );

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
          aria-label="Sort ranking"
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
            aria-label="Filter by language"
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
              All
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
                {languageDisplayName(code) ?? code}{' '}
                <span className="text-text-muted">({count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-text-muted">
          No streamers match this filter.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl bg-background-elevated p-1 gradient-border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              {category} streamers ranked by follower count
            </caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th scope="col" className="px-3 py-2 font-semibold">
                  #
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Streamer
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Followers
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Avg viewers
                </th>
                {hasHours && (
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Hours (28d)
                  </th>
                )}
                {hasShare && (
                  <th
                    scope="col"
                    className="px-3 py-2 text-right font-semibold"
                    title={`Share of the streamer's recent broadcasts that were ${category}`}
                  >
                    Game share
                  </th>
                )}
                {hasNext && (
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Next stream
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
                        {canonical && <TrendIndicator row={row} />}
                      </span>
                    </td>
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      <Link
                        href={`/streamer/${encodeURIComponent(row.id)}`}
                        className="group flex items-center gap-3"
                      >
                        {row.avatarUrl ? (
                          <Image
                            src={row.avatarUrl}
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
                                {languageDisplayName(row.language)}
                              </span>
                            )}
                          </span>
                        </span>
                      </Link>
                    </th>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-accent-cyan">
                      {formatCompactNumber(row.followerCount, 'en')}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                      {row.avgViewCount != null && row.avgViewCount > 0
                        ? formatCompactNumber(row.avgViewCount, 'en')
                        : '—'}
                    </td>
                    {hasHours && (
                      <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                        {row.hours28d != null && row.hours28d > 0
                          ? formatHours(row.hours28d)
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
                                ? `Main game: ${row.sharePercent}% of their recent broadcasts`
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
                            Live now
                            {row.liveViewerCount != null && (
                              <>
                                {' '}
                                · {formatCompactNumber(row.liveViewerCount, 'en')} watching
                              </>
                            )}
                          </span>
                        ) : row.nextStreamAt ? (
                          <span className="flex flex-col items-end leading-tight">
                            <NextStreamTime
                              startTime={row.nextStreamAt}
                              isPredicted={row.nextIsPredicted}
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
      )}
    </div>
  );
}
