import Image from 'next/image';
import Link from 'next/link';
import type { RankingRowDto } from '@/lib/rankings-row';
import { RANKING_AVATAR_PX } from '@/lib/rankings-row';
import { LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { NextStreamTime } from '@/components/web/NextStreamTime';
import type { UiLang } from '@/lib/i18n-core';

/**
 * Presentational leaderboard table, rendered from resolved rows
 * (lib/rankings-row.ts) and pre-localized chrome.
 *
 * DELIBERATELY NOT a server component and deliberately NOT 'use client': it is
 * the ONE renderer for both regimes. The server pages (RankingTable →
 * /rankings/<metric>, /rankings) render it with zero client JS, while the
 * hub's filter island renders the same component in the browser with rows it
 * fetched from /api/rankings/filter. Two copies of this markup is exactly how
 * the filtered preview would drift away from the page it sits on.
 *
 * Consequence for maintenance: nothing server-only may be imported here (no
 * hub lexicon, no metric registry, no Set/Map props) — every string and every
 * flag arrives resolved. See lib/rankings-row.ts.
 */
export interface RankingTableChrome {
  /** sr-only <caption>, e.g. "Most followed streamers". */
  caption: string;
  /** Metric value columns, index-aligned with `row.values`. */
  headers: { label: string; primary: boolean }[];
  /** Header of the "Main game" column; omit to drop the column. */
  mainGameHeader?: string;
  /** Header of the "Next stream" column; omit to drop the column. */
  nextStreamHeader?: string;
  tableColStreamer: string;
}

// Medal accents for ranks 1-3 (gold/silver/bronze, tuned for the dark theme).
const MEDAL_CLASSES: Record<number, string> = {
  1: 'text-[#FFC94D]',
  2: 'text-[#C7CEDD]',
  3: 'text-[#C9885A]',
};

/**
 * Freezes the ranking metric to the right edge of the scroll container, so the
 * number the page is ranked by is fully readable at any scroll position. Needs
 * its own opaque background and a border, otherwise the columns scrolling
 * underneath show through. `right-0` resolves against the `overflow-x-auto`
 * wrapper.
 */
const PRIMARY_STICKY =
  'sticky right-0 z-10 border-l border-divider bg-background-elevated';

/** ▲2 / ▼1 / "new" next to the rank — resolved in lib/rankings-row.ts. */
function TrendIndicator({ trend }: { trend: RankingRowDto['trend'] }) {
  if (!trend) return null;
  if (trend.kind === 'new') {
    return (
      <span
        className="text-[9px] font-bold uppercase tracking-wider text-accent-cyan"
        title={trend.title}
      >
        {trend.label}
      </span>
    );
  }
  const up = trend.kind === 'up';
  return (
    <span
      className={`text-[10px] font-semibold tabular-nums ${up ? 'text-live' : 'text-accent-pink'}`}
      title={trend.title}
    >
      {up ? '▲' : '▼'}
      {trend.delta}
    </span>
  );
}

/**
 * Value of the "Main game" column: the game on top, the share of the
 * streamer's categorized streams it accounts for underneath.
 *
 * The share used to live in the `title` only, where it was invisible to
 * everyone not hovering a mouse — and it is what makes the column mean
 * anything (62% is a habit, 21% is merely the largest of many). Two lines
 * rather than "Game (62%)" so the game name keeps the full cell width before
 * it truncates; same shape as the next-stream cell below.
 */
function MainGameCell({ mainGame }: { mainGame: RankingRowDto['mainGame'] }) {
  if (!mainGame) return <>—</>;
  // The truncation moved from the <td> into the name: with two lines in the
  // cell, `truncate` on the cell itself would have clipped the block, not the
  // one line that can actually be too long. The cap sits under the column's
  // own max-width, so a long game name elides instead of widening the table.
  const name = mainGame.href ? (
    <Link
      href={mainGame.href}
      className="max-w-[9rem] truncate text-text-secondary underline decoration-border-default underline-offset-4 transition-colors hover:text-accent-cyan hover:decoration-accent-cyan/60"
    >
      {mainGame.label}
    </Link>
  ) : (
    <span className="max-w-[9rem] truncate">{mainGame.label}</span>
  );
  return (
    <span className="flex flex-col items-end leading-tight" title={mainGame.title}>
      {name}
      {mainGame.share && (
        <span className="mt-0.5 text-[11px] tabular-nums text-text-muted">
          {mainGame.share}
        </span>
      )}
    </span>
  );
}

/** Value of the "Next stream" column for one row. */
function NextStreamCell({
  nextStream,
  locale,
}: {
  nextStream: RankingRowDto['nextStream'];
  locale: UiLang;
}) {
  if (!nextStream) return <>—</>;
  if (nextStream.kind === 'always-on') {
    return <span title={nextStream.title}>24/7</span>;
  }
  return (
    <span className="flex flex-col items-end leading-tight">
      <NextStreamTime
        startTime={nextStream.startTime}
        isPredicted={nextStream.isPredicted}
        language={locale}
      />
      {nextStream.category && (
        <span
          className="mt-0.5 max-w-[9rem] truncate text-[11px] text-text-muted"
          title={nextStream.category}
        >
          {nextStream.category}
        </span>
      )}
    </span>
  );
}

export function RankingRowsTable({
  chrome,
  rows,
  rowAnchorPrefix,
  locale = 'en',
}: {
  chrome: RankingTableChrome;
  rows: RankingRowDto[];
  /**
   * When set, each row gets id="{prefix}-{rank}" so positions are deep-linkable
   * (e.g. /rankings/most-followed#rank-42). Leave unset on pages that render
   * several tables (the hub) — the ids would collide.
   */
  rowAnchorPrefix?: string;
  locale?: UiLang;
}) {
  // Six columns cannot fit a 390px phone at any width, and the ranking metric —
  // the whole point of the page — was the column that fell off the right edge,
  // so "39.7K" read as "39.7": a wrong number, not just a truncated one. The
  // min-width stops the columns squeezing, and the primary metric is frozen to
  // the right edge so it stays fully readable at every scroll position while
  // the enrichment columns scroll under it. The scrollbar is deliberately NOT
  // hidden here — unlike the decorative chip rails, a data table needs it.
  const hasWideColumns = Boolean(chrome.mainGameHeader || chrome.nextStreamHeader);
  return (
    // Two nested divs on purpose: gradient-border paints its frame via an
    // absolutely-positioned ::before, and absolute descendants of a scroll
    // container SCROLL WITH the content — on one combined div the frame's
    // right edge cut through the middle of the table as soon as you scrolled.
    // Frame outside, overflow inside (same split as BestGamesTable). Keep the
    // padding on the OUTER div: on the scroll element itself it would make the
    // sticky metric column stick 4px short of the edge.
    <div className="rounded-xl bg-background-elevated p-1 gradient-border">
      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${hasWideColumns ? 'min-w-[34rem]' : ''}`}>
          <caption className="sr-only">{chrome.caption}</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
              <th scope="col" className="px-3 py-2 font-semibold">
                #
              </th>
              {/* Floor for the whole column (auto layout takes the max over all
                  cells). Without it, tables with few short-named rows — the hub's
                  Top-5 previews — let the OTHER columns' content squeeze this one
                  to ~140px, stacking the LIVE/platform badges one per line and
                  tripling the row height. 15rem keeps avatar + name + badge row
                  on one line; long names still truncate. */}
              <th scope="col" className="min-w-[15rem] px-3 py-2 font-semibold">
                {chrome.tableColStreamer}
              </th>
              {chrome.headers.map((header) => (
                <th
                  key={header.label}
                  scope="col"
                  className={`px-3 py-2 text-right font-semibold ${
                    header.primary ? PRIMARY_STICKY : ''
                  }`}
                >
                  {header.label}
                </th>
              ))}
              {chrome.mainGameHeader && (
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  {chrome.mainGameHeader}
                </th>
              )}
              {chrome.nextStreamHeader && (
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  {chrome.nextStreamHeader}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const medal = MEDAL_CLASSES[row.rank];
              return (
                <tr
                  key={row.streamerId}
                  id={rowAnchorPrefix ? `${rowAnchorPrefix}-${row.rank}` : undefined}
                  // scroll-mt clears the sticky site header when jumping to a row anchor
                  className="scroll-mt-20 border-t border-divider"
                >
                  <td className="px-3 py-2">
                    <span className="flex items-baseline gap-1.5">
                      <span
                        className={`font-bold tabular-nums ${medal ?? 'text-text-muted'}`}
                      >
                        {row.rank}
                      </span>
                      <TrendIndicator trend={row.trend} />
                    </span>
                  </td>
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    <Link href={row.href} className="group flex items-center gap-3">
                      {row.avatarUrl ? (
                        <Image
                          src={row.avatarUrl}
                          alt={row.name}
                          width={RANKING_AVATAR_PX}
                          height={RANKING_AVATAR_PX}
                          unoptimized
                          className="shrink-0 rounded-full border border-border-default"
                        />
                      ) : (
                        <InitialsAvatar
                          name={row.name}
                          size={RANKING_AVATAR_PX}
                          className="shrink-0"
                        />
                      )}
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold text-text-primary group-hover:text-accent-cyan">
                          {row.name}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          {row.isLive && <LiveBadge size="sm" />}
                          {row.platforms.map((p) => (
                            <PlatformBadge key={p} platform={p} size="sm" />
                          ))}
                          {row.languageLabel && (
                            <span className="text-[10px] tracking-wider text-text-muted">
                              {row.languageLabel}
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </th>
                  {row.values.map((value, i) => (
                    <td
                      key={chrome.headers[i]?.label ?? i}
                      className={
                        chrome.headers[i]?.primary
                          ? `whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-accent-cyan ${PRIMARY_STICKY}`
                          : 'whitespace-nowrap px-3 py-2 text-right tabular-nums text-text-secondary'
                      }
                    >
                      {value}
                    </td>
                  ))}
                  {chrome.mainGameHeader && (
                    <td className="max-w-40 px-3 py-2 text-right text-text-secondary">
                      <MainGameCell mainGame={row.mainGame} />
                    </td>
                  )}
                  {chrome.nextStreamHeader && (
                    <td className="whitespace-nowrap px-3 py-2 text-right text-text-secondary">
                      <NextStreamCell nextStream={row.nextStream} locale={locale} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
