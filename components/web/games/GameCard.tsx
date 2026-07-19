import Image from 'next/image';
import Link from 'next/link';
import type { PublicGame } from '@/lib/server/partner-api';
import { formatCompactNumber } from '@/lib/format/number';

/** Gradient placeholder when a category has no resolved box art (same visual
 *  language as SlotCard's PlaceholderThumbnail). */
function PlaceholderBoxArt({ name }: { name: string }) {
  const letter = (name?.trim()?.[0] ?? '?').toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-purple/40 to-accent-cyan/30 text-3xl font-bold text-white"
    >
      {letter}
    </div>
  );
}

export function GameBoxArt({
  boxArtUrl,
  name,
  sizes,
}: {
  boxArtUrl: string | null | undefined;
  name: string;
  sizes: string;
}) {
  return (
    <div className="relative aspect-[285/380] w-full overflow-hidden rounded-lg bg-background-highlight">
      {boxArtUrl ? (
        <Image
          src={boxArtUrl}
          alt={`${name} box art`}
          fill
          unoptimized
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <PlaceholderBoxArt name={name} />
      )}
    </div>
  );
}

function TrendBadge({ delta }: { delta: number }) {
  const up = delta >= 0;
  return (
    <span
      className={`text-[10px] font-semibold ${up ? 'text-live' : 'text-accent-pink'}`}
      title="Week-over-week change in active streamers"
    >
      {up ? '▲' : '▼'} {Math.abs(delta)}%
    </span>
  );
}

/**
 * Box-art card for the /games catalog grid. Every stat renders only when its
 * (nullable) source field is present — an old-API deploy or a cold aggregate
 * simply shows fewer numbers.
 */
export function GameCard({ game, slug }: { game: PublicGame; slug: string }) {
  const liveCount = game.live_streamer_count ?? 0;
  const hours = game.hours_28d;

  return (
    <Link
      href={`/game/${slug}`}
      prefetch={false}
      className="group block rounded-xl border border-border-default bg-background-elevated p-2 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
    >
      <div className="relative">
        <GameBoxArt
          boxArtUrl={game.box_art_url}
          name={game.category}
          sizes="(min-width: 1024px) 160px, (min-width: 640px) 25vw, 33vw"
        />
        {liveCount > 0 && (
          <span className="absolute left-1 top-1 rounded bg-live px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
            {liveCount} live
          </span>
        )}
      </div>
      <div className="mt-2 min-w-0">
        <h3
          className="truncate text-sm font-semibold text-text-primary group-hover:text-accent-cyan"
          title={game.category}
        >
          {game.category}
        </h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-text-muted">
          <span>
            {game.streamer_count} streamer{game.streamer_count === 1 ? '' : 's'}
          </span>
          {hours != null && <span>{formatCompactNumber(Math.round(hours))}h / 28d</span>}
          {game.trend_delta_percent != null && <TrendBadge delta={game.trend_delta_percent} />}
        </p>
        {game.live_viewer_total != null && liveCount > 0 && (
          <p className="mt-0.5 text-[11px] font-medium text-live">
            {formatCompactNumber(game.live_viewer_total)} watching now
          </p>
        )}
      </div>
    </Link>
  );
}
