'use client';

// M24 /best-games-to-stream table with the client-side sort toggle
// ("Best opportunity" ↔ "Fewest competition") and viewer-TZ best-slot labels.
// One island for the whole table: the sort swaps row order without a second
// fetch, and the slot column needs the timezone shift anyway.
//
// Mobile: the table scrolls horizontally inside its own container — the page
// never does. The rank+game cell is sticky-left so scrolling the value
// columns never loses the row context, and a right edge-fade signals that
// more columns exist (phones would otherwise never discover them).

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { localUtcOffsetHours } from '@/lib/game-heatmap';
import { formatSlotLabel, shiftSlot } from '@/lib/game-timing';
import { formatStatValue } from '@/lib/format/number';
import { useHScrollFade } from '@/lib/use-h-scroll-fade';
import {
  sortBestGameRows,
  type BestGameRow,
  type BestGamesSort,
} from '@/lib/best-games';

function subscribe(): () => void {
  return () => {};
}

const SORTS: { key: BestGamesSort; label: string }[] = [
  { key: 'opportunity', label: 'Best opportunity' },
  { key: 'competition', label: 'Fewest competition' },
];

function GameCell({ row, rank }: { row: BestGameRow; rank: number }) {
  const inner = (
    // Bounded width so `truncate` bites inside the sticky cell — unbounded,
    // a long category name would stretch the sticky column across the phone
    // viewport and leave nothing to scroll into view.
    <span className="flex min-w-0 max-w-[46vw] items-center gap-2 sm:max-w-[280px] sm:gap-3">
      <span className="w-5 shrink-0 text-right text-xs font-bold tabular-nums text-text-muted">
        {rank}
      </span>
      {row.boxArtUrl ? (
        <Image
          src={row.boxArtUrl}
          alt=""
          width={30}
          height={40}
          unoptimized
          className="shrink-0 rounded-[3px] border border-border-default"
        />
      ) : (
        <span className="flex h-10 w-[30px] shrink-0 items-center justify-center rounded-[3px] border border-border-default bg-background text-[10px] font-bold text-text-muted">
          {row.category.charAt(0)}
        </span>
      )}
      <span className="truncate font-semibold text-text-primary group-hover:text-accent-cyan">
        {row.category}
      </span>
      {/* Icon-only trending marker: a third of the rows trend in a normal
          week — the full pink badge repeated 16× is noise, not signal. The
          full badge lives on the top-3 cards and the /best-time pages. */}
      {row.isTrending && (
        <span
          title="Trending on Twitch this week"
          className="shrink-0 text-[10px] font-semibold text-accent-pink"
        >
          ▲<span className="sr-only"> Trending on Twitch this week</span>
        </span>
      )}
    </span>
  );
  return row.hasHub ? (
    <Link href={`/game/${row.slug}`} prefetch={false} className="group block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function BestGamesTable({ rows }: { rows: BestGameRow[] }) {
  const [sort, setSort] = useState<BestGamesSort>('opportunity');
  const shift = useSyncExternalStore(
    subscribe,
    () => localUtcOffsetHours(),
    () => 0,
  );
  const sorted = useMemo(() => sortBestGameRows(rows, sort), [rows, sort]);
  const { ref, fade } = useHScrollFade<HTMLDivElement>();

  return (
    <div>
      <div
        role="group"
        aria-label="Sort order"
        className="inline-flex flex-wrap gap-1 rounded-lg border border-border-default bg-background-elevated p-1"
      >
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSort(s.key)}
            aria-pressed={sort === s.key}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              sort === s.key
                ? 'bg-background-highlight text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* gradient-border is position:relative — the fade overlay anchors to it,
          OUTSIDE the scrolling element, so it stays put while content moves. */}
      <div className="mt-4 rounded-xl bg-background-elevated gradient-border">
        {/* Vertical padding only: with horizontal padding the sticky column
            sticks 4px short of the edge and scrolled content peeks through
            the gap. */}
        <div ref={ref} className="overflow-x-auto rounded-xl py-1">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">
              Categories ranked by streaming opportunity (average viewers per
              concurrently live tracked channel, last 28 days)
            </caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th
                  scope="col"
                  className="sticky left-0 z-[1] bg-background-elevated px-3 py-2 font-semibold"
                >
                  Game
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Viewers / channel
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Best slot
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Avg. live channels
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Tracked channels
                </th>
              </tr>
            </thead>
            <tbody suppressHydrationWarning>
              {sorted.map((row, i) => {
                const local = row.bestSlot ? shiftSlot(row.bestSlot, shift) : null;
                return (
                  <tr key={row.category} className="border-t border-divider">
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] bg-background-elevated px-3 py-2 text-left font-medium"
                    >
                      <GameCell row={row} rank={i + 1} />
                    </th>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-accent-cyan">
                      {formatStatValue(row.score)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-text-secondary">
                      {local && row.bestSlot ? (
                        row.hasHub ? (
                          <Link
                            href={`/game/${row.slug}/best-time`}
                            prefetch={false}
                            className="hover:text-accent-cyan"
                          >
                            {formatSlotLabel(local.dow, local.hour)}
                          </Link>
                        ) : (
                          formatSlotLabel(local.dow, local.hour)
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                      {row.avgStreamers !== null ? formatStatValue(row.avgStreamers) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                      {row.trackedStreamers > 0 ? row.trackedStreamers : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Right-edge fade only: the sticky game column IS the left context,
            a left fade would just dim it. */}
        {fade.right && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 right-0 w-10 rounded-r-xl bg-gradient-to-l from-background-elevated to-transparent"
          />
        )}
      </div>
    </div>
  );
}
