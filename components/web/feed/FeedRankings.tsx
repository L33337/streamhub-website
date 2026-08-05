'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { sizedAvatarUrl, sizedCdnImageUrl } from '@/lib/format/image-size';
import { FeedSectionHeader } from './FeedSectionHeader';
import { FEED_ANCHORS, FEED_SECTION_ANCHOR_CLASS } from '@/lib/feed/anchors';
import type { FeedRankingRow, FeedRankingsBlock, FeedRankingsData } from '@/lib/feed/rankings';

/**
 * "Rankings" — one block per leaderboard metric: the global top 3, then where
 * the viewer's own favorites sit on it.
 *
 * A client component only because the whole feed body is one; it holds no
 * state and every href arrives pre-built (locale-prefixed) from the server, so
 * nothing here needs the route locale.
 */
export function FeedRankings({ data }: { data: FeedRankingsData }) {
  if (data.blocks.length === 0) return null;

  return (
    <section
      id={FEED_ANCHORS.rankings}
      className={FEED_SECTION_ANCHOR_CLASS}
      data-feed-section="rankings"
      aria-label="Rankings"
    >
      <FeedSectionHeader title="Rankings" actionLabel="All rankings" actionHref="/rankings" />
      {/* Two columns from md up. Five blocks make an odd grid, which is fine —
          a dangling last card reads as "the list ended", not as a gap. */}
      <ul className="grid gap-3 md:grid-cols-2">
        {data.blocks.map((block) => (
          <li key={block.metric}>
            <RankingBlockCard block={block} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RankingBlockCard({ block }: { block: FeedRankingsBlock }) {
  const podiumTotal = block.top3[0]?.total;
  const moreCount = block.moreFavRows.length;

  return (
    <div className="h-full rounded-xl border border-border-default bg-background-elevated p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="min-w-0 text-sm font-bold text-text-primary">
          {/* The `before` box grows the hit area to the 44px touch minimum on
              the Y axis without changing the header's visual height — the
              site's touch-target expander (see filter-controls.ts). `relative`
              scopes it; `inline-block` gives it a box to expand from. */}
          <Link
            href={block.href}
            className="relative inline-block py-0.5 before:absolute before:inset-x-0 before:-inset-y-[11px] before:content-[''] hover:text-accent-cyan"
          >
            {block.title}
          </Link>
        </h3>
        {typeof podiumTotal === 'number' && (
          <span className="text-[11px] text-text-muted">{podiumTotal} streamers</span>
        )}
      </div>

      <ol className="mt-3 space-y-1.5">
        {block.top3.map((row) => (
          <RankRow key={row.streamerId} row={row} />
        ))}
      </ol>

      {block.favRows.length > 0 && (
        <>
          {/* The divider carries the meaning: everything under it is "yours". */}
          <p className="mt-3 border-t border-divider pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            You follow
          </p>
          <ol className="mt-1.5 space-y-1.5">
            {block.favRows.map((row) => (
              <RankRow key={row.streamerId} row={row} />
            ))}
          </ol>
        </>
      )}

      {moreCount > 0 && (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none rounded-lg px-1 py-1.5 text-xs font-semibold text-accent-cyan hover:underline">
            {/* Both labels ship; CSS swaps them, so the button never lies about
                its own state and no JS is involved. */}
            <span className="group-open:hidden">
              Show {moreCount} more {moreCount === 1 ? 'favorite' : 'favorites'}
            </span>
            <span className="hidden group-open:inline">Show less</span>
          </summary>
          <ol className="mt-1.5 space-y-1.5">
            {block.moreFavRows.map((row) => (
              <RankRow key={row.streamerId} row={row} />
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function RankRow({ row }: { row: FeedRankingRow }) {
  const avatar = sizedAvatarUrl(row.avatarUrl, 24);
  return (
    <li>
      <Link
        href={row.href}
        prefetch={false}
        className="flex min-h-11 items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-background-highlight"
        aria-label={`${row.name}, rank ${row.rank} of ${row.total}, ${row.value}`}
      >
        <span className="w-7 shrink-0 text-right text-xs font-bold tabular-nums text-text-muted">
          {row.rank}
        </span>
        {avatar ? (
          <Image
            src={sizedCdnImageUrl(avatar, 24)}
            alt=""
            width={24}
            height={24}
            unoptimized
            className="h-6 w-6 shrink-0 rounded-full object-cover"
          />
        ) : (
          <InitialsAvatar name={row.name} size={24} className="shrink-0 border" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
          {row.name}
          {row.isFavorite && (
            <Heart
              size={11}
              className="ml-1.5 inline align-[-1px] fill-accent-cyan text-accent-cyan"
              aria-label="One of your favorites"
            />
          )}
        </span>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-text-secondary">
          {row.value}
        </span>
        <TrendArrow trend={row.trend} />
      </Link>
    </li>
  );
}

/**
 * Rank movement vs the ~7-day baseline. `none` renders a fixed-width spacer
 * rather than nothing, so the value column stays aligned down the card —
 * and never a "NEW" badge, which an unbounded rank cannot justify.
 */
function TrendArrow({ trend }: { trend: FeedRankingRow['trend'] }) {
  if (trend.kind === 'none') return <span className="w-7 shrink-0" aria-hidden="true" />;
  const up = trend.kind === 'up';
  return (
    <span
      className={`w-7 shrink-0 text-right text-[11px] font-semibold tabular-nums ${
        up ? 'text-delta-up' : 'text-delta-down'
      }`}
      title={up ? `Up ${trend.delta} since last week` : `Down ${trend.delta} since last week`}
    >
      {up ? '▲' : '▼'}
      {trend.delta}
    </span>
  );
}
