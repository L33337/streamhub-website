'use client';

// M24 /best-games-to-stream table with the client-side sort toggle
// ("Best opportunity" ↔ "Fewest competition") and viewer-TZ best-slot labels.
// One island for the whole table: the sort swaps row order without a second
// fetch, and the slot column needs the timezone shift anyway. Mobile: the
// table scrolls horizontally inside its own container — the page never does.

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { localUtcOffsetHours } from '@/lib/game-heatmap';
import { formatSlotLabel, shiftSlot } from '@/lib/game-timing';
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

function GameCell({ row }: { row: BestGameRow }) {
  const inner = (
    <span className="flex min-w-0 items-center gap-3">
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
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-semibold text-text-primary group-hover:text-accent-cyan">
          {row.category}
        </span>
        {row.isTrending && (
          <span className="mt-0.5 text-[10px] font-semibold text-accent-pink">
            ▲ Trending this week
          </span>
        )}
      </span>
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

      <div className="mt-4 overflow-x-auto rounded-xl bg-background-elevated p-1 gradient-border">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">
            Categories ranked by streaming opportunity (average viewers per
            concurrently live tracked channel, last 28 days)
          </caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
              <th scope="col" className="px-3 py-2 font-semibold">
                #
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
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
            </tr>
          </thead>
          <tbody suppressHydrationWarning>
            {sorted.map((row, i) => {
              const local = row.bestSlot ? shiftSlot(row.bestSlot, shift) : null;
              return (
                <tr key={row.category} className="border-t border-divider">
                  <td className="px-3 py-2 font-bold tabular-nums text-text-muted">{i + 1}</td>
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    <GameCell row={row} />
                  </th>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-accent-cyan">
                    {Math.round(row.score * 10) / 10}
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
                    {row.avgStreamers !== null
                      ? Math.round(row.avgStreamers * 10) / 10
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
