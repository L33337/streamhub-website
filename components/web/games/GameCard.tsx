import Image from 'next/image';
import Link from 'next/link';
import type { PublicGame } from '@/lib/server/partner-api';
import { formatCompactNumber } from '@/lib/format/number';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { slotLexFor } from '@/lib/i18n-slot';

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
  priority = false,
}: {
  boxArtUrl: string | null | undefined;
  name: string;
  sizes: string;
  // Above-the-fold usage only (LCP): eager load + fetchpriority=high +
  // preload. Everything below the fold stays lazy (the default).
  priority?: boolean;
}) {
  // The <Image> below is deliberately NOT `unoptimized`, unlike every other
  // remote <Image> on the site. Box art is the one safe exception to that
  // convention: it is a small, closed set (~260 categories) whose URLs stay
  // stable for the lifetime of a game, so the optimizer cache is hit almost
  // every time. Avatars and stream thumbnails change per stream and would
  // churn the cache for no gain — leave those unoptimized. Measured 2026-07-20
  // at the w=384 bucket this grid actually requests: 25.3 KB JPEG -> 12.1 KB
  // AVIF (12.7 KB WebP), and the page renders 70+ of them.
  return (
    <div className="relative aspect-[285/380] w-full overflow-hidden rounded-lg bg-background-highlight">
      {boxArtUrl ? (
        <Image
          src={boxArtUrl}
          alt={`${name} box art`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <PlaceholderBoxArt name={name} />
      )}
    </div>
  );
}

export function TrendBadge({
  delta,
  title = 'Week-over-week change in active streamers',
}: {
  delta: number;
  title?: string;
}) {
  const up = delta >= 0;
  return (
    <span
      className={`text-[10px] font-semibold ${up ? 'text-live' : 'text-accent-pink'}`}
      title={title}
    >
      {up ? '▲' : '▼'} {Math.abs(delta)}%
    </span>
  );
}

/**
 * Box-art card for the /games catalog grid. Every stat renders only when its
 * (nullable) source field is present — an old-API deploy or a cold aggregate
 * simply shows fewer numbers.
 *
 * The card is NOT one big <Link>: the top-streamer names are their own links to
 * /streamer/<id> (SEO — ~200 crawlable "name + game" anchors that the plain-text
 * version gave away for free). Nested anchors are invalid HTML, so the card-wide
 * click target is the stretched title link (`after:absolute after:inset-0`) and
 * the name links sit above it via `relative z-10`.
 */
export function GameCard({
  game,
  slug,
  priority = false,
  locale = 'en',
}: {
  game: PublicGame;
  slug: string;
  priority?: boolean;
  /** M22 S4.1: localizes the stat lines (SlotLex, client-safe) and keeps the
   *  card's links inside the viewer's locale tree. Default 'en' = byte-identical. */
  locale?: UiLang;
}) {
  const L = slotLexFor(locale);
  const liveCount = game.live_streamer_count ?? 0;
  const hours = game.hours_28d;
  // Top-3 most-followed streamers (nightly aggregate) — people search
  // "streamer + game", so each name links to its streamer page.
  const top = (game.top_streamers ?? []).filter((t) => t?.id && t?.name);
  const moreCount = Math.max(0, game.streamer_count - top.length);

  return (
    <article className="group relative rounded-xl border border-border-default bg-background-elevated p-2 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight">
      <div className="relative">
        <GameBoxArt
          boxArtUrl={game.box_art_url}
          name={game.category}
          sizes="(min-width: 1024px) 160px, (min-width: 640px) 25vw, 33vw"
          priority={priority}
        />
        {liveCount > 0 && (
          <span className="absolute left-1 top-1 rounded bg-live px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">
            {L.gameLiveBadge(liveCount)}
          </span>
        )}
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-cyan">
          <Link
            href={localeHref(locale, `/game/${slug}`)}
            prefetch={false}
            title={game.category}
            // Stretched link: covers the whole card as the primary click
            // target without wrapping (and thus swallowing) the name links.
            // The truncation lives on the inner span, NOT on this anchor or
            // the h3 — an `overflow:hidden` ancestor between the ::after and
            // its containing block (the <article>) would clip the overlay
            // down to the title text.
            className="block after:absolute after:inset-0 after:z-0 after:content-['']"
          >
            <span className="block truncate">{game.category}</span>
          </Link>
        </h3>
        {top.length > 0 && (
          <p
            className="relative z-10 mt-0.5 line-clamp-2 text-[11px] leading-tight text-text-secondary"
            title={top.map((t) => t.name).join(', ')}
          >
            {top.map((t, i) => (
              <span key={t.id}>
                {i > 0 && ', '}
                <Link
                  href={localeHref(locale, `/streamer/${encodeURIComponent(t.id)}`)}
                  prefetch={false}
                  className="hover:text-accent-cyan hover:underline"
                >
                  {t.name}
                </Link>
              </span>
            ))}
            {moreCount > 0 && <span className="text-text-muted"> +{moreCount}</span>}
          </p>
        )}
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-text-muted">
          <span>{L.gameStreamerCount(game.streamer_count)}</span>
          {hours != null && (
            <span>{L.gameHoursShort(formatCompactNumber(Math.round(hours), locale))}</span>
          )}
          {game.trend_delta_percent != null && (
            <TrendBadge delta={game.trend_delta_percent} title={L.gameTrendTitle} />
          )}
        </p>
        {game.live_viewer_total != null && liveCount > 0 && (
          <p className="mt-0.5 text-[11px] font-medium text-live">
            {L.gameWatchingNow(formatCompactNumber(game.live_viewer_total, locale))}
          </p>
        )}
      </div>
    </article>
  );
}
