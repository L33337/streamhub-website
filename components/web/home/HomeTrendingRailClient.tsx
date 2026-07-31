'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { GameBoxArt, TrendBadge } from '@/components/web/games/GameCard';
import { RailScroller } from '@/components/web/feed/RailScroller';
import type { TrendingOrders, TrendingSortMode } from '@/lib/home/trending-sort';
import {
  FILTER_SEGMENT_BUTTON_ACTIVE_CLASS,
  FILTER_SEGMENT_BUTTON_CLASS,
  FILTER_SEGMENT_BUTTON_IDLE_CLASS,
  FILTER_SEGMENT_GROUP_CLASS,
  FILTER_SEGMENT_SCROLLER_CLASS,
} from './filter-controls';

/**
 * One rail tile, flattened and fully localized by the server — the island gets
 * no `PublicGame`, no `Map`, no formatter and no lexicon.
 */
export interface TrendingTile {
  /** Twitch's rank; also the React key and the sort tiebreaker. */
  rank: number;
  name: string;
  boxArtUrl: string | null;
  /** null = not in OUR catalog → no internal link (never emit a 404 link). */
  slug: string | null;
  topStreamers: { id: string; name: string }[];
  trendDelta: number | null;
  rankLabel: string;
  /** Metric lines, pre-rendered per mode; null when the metric is unknown. */
  hoursLabel: string | null;
  viewersLabel: string | null;
  streamersLabel: string | null;
}

export interface TrendingSortStrings {
  aria: string;
  modes: Record<TrendingSortMode, string>;
}

/**
 * "Trending on Twitch" rail with a sort control (2026-07-31).
 *
 * The served order is always Twitch's own top-games rank, so the SSR markup and
 * the unfiltered mount are identical and a JS-less browser sees exactly what it
 * saw before. The other three modes reorder by OUR catalog stats.
 *
 * Unlike the live rail and the lineup — which stay server-rendered and are only
 * `hidden`-toggled by their island — the tiles live in this client component.
 * Reordering with CSS `order` would leave DOM/tab order in the Twitch sequence
 * while the eye reads another one (WCAG 2.4.3), and at 20 small tiles the DOM
 * budget that motivated the imperative pattern is not a concern. Next still
 * server-renders this component, so every game name and link ships in the HTML.
 */
export function HomeTrendingRailClient({
  tiles,
  orders,
  modes,
  strings,
  locale,
}: {
  tiles: TrendingTile[];
  orders: TrendingOrders;
  /** Modes worth offering for THIS list (see availableTrendingModes). */
  modes: TrendingSortMode[];
  strings: TrendingSortStrings;
  locale: UiLang;
}) {
  const [mode, setMode] = useState<TrendingSortMode>('twitch');
  const containerRef = useRef<HTMLDivElement>(null);
  const order = orders[mode] ?? orders.twitch;

  // Re-sorting leaves the horizontal scroller parked at the old offset, i.e.
  // deep inside a list that now starts somewhere else. Same rewind the live
  // rail's filters do when the card set changes under them.
  useEffect(() => {
    containerRef.current
      ?.querySelectorAll<HTMLElement>('[data-rail-scroll]')
      .forEach((node) => {
        node.scrollLeft = 0;
      });
  }, [mode]);

  return (
    <div ref={containerRef}>
      {/* A single mode is no choice — with no catalog stats at all only the
          Twitch order remains, and the control would be dead chrome. */}
      {modes.length > 1 && (
        // Three nested elements on purpose: outer spacing, then the scroller,
        // then the bordered group — see FILTER_SEGMENT_* for why the overflow
        // must not sit on the group. The spacing may NOT be merged into the
        // scroller's class either: its `-my-1` and an `mb-*` land in the same
        // Tailwind layer, so which one owns margin-bottom is decided by
        // stylesheet order, and the padding it is meant to cancel leaks back
        // into the layout.
        <div className="mb-3">
          <div className={FILTER_SEGMENT_SCROLLER_CLASS}>
            <div role="group" aria-label={strings.aria} className={FILTER_SEGMENT_GROUP_CLASS}>
              {modes.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  aria-pressed={mode === option}
                  className={`${FILTER_SEGMENT_BUTTON_CLASS} ${
                    mode === option
                      ? FILTER_SEGMENT_BUTTON_ACTIVE_CLASS
                      : FILTER_SEGMENT_BUTTON_IDLE_CLASS
                  }`}
                >
                  {strings.modes[option]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <RailScroller contentClassName="pb-2">
        <ul className="flex gap-3">
          {order.map((index) => {
            const tile = tiles[index];
            if (!tile) return null;
            // The metric the current sort is based on — otherwise the order
            // looks arbitrary. 'twitch' keeps the hours line it always had.
            const metric =
              mode === 'viewers'
                ? tile.viewersLabel
                : mode === 'streamers'
                  ? tile.streamersLabel
                  : tile.hoursLabel;

            return (
              <li key={tile.rank} className="w-40 shrink-0">
                <article className="group relative h-full rounded-xl border border-border-default bg-background-elevated p-2 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight">
                  <GameBoxArt boxArtUrl={tile.boxArtUrl} name={tile.name} sizes="160px" />
                  <div className="mt-2 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-cyan">
                      {tile.slug ? (
                        // Internal link only when the game exists in OUR
                        // catalog — never emit internal 404 links.
                        <Link
                          href={localeHref(locale, `/game/${tile.slug}`)}
                          prefetch={false}
                          title={tile.name}
                          className="block after:absolute after:inset-0 after:z-0 after:content-['']"
                        >
                          <span className="block truncate">{tile.name}</span>
                        </Link>
                      ) : (
                        <span className="block truncate" title={tile.name}>
                          {tile.name}
                        </span>
                      )}
                    </h3>
                    {tile.topStreamers.length > 0 && (
                      <p
                        className="relative z-10 mt-0.5 line-clamp-2 text-[11px] leading-tight text-text-secondary"
                        title={tile.topStreamers.map((t) => t.name).join(', ')}
                      >
                        {tile.topStreamers.map((t, i) => (
                          <span key={t.id}>
                            {i > 0 && ', '}
                            <Link
                              href={localeHref(
                                locale,
                                `/streamer/${encodeURIComponent(t.id)}`,
                              )}
                              prefetch={false}
                              className="hover:text-accent-cyan hover:underline"
                            >
                              {t.name}
                            </Link>
                          </span>
                        ))}
                      </p>
                    )}
                    {(metric !== null || tile.trendDelta !== null) && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-text-muted">
                        {metric !== null && <span>{metric}</span>}
                        {tile.trendDelta !== null && <TrendBadge delta={tile.trendDelta} />}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-text-muted">{tile.rankLabel}</p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </RailScroller>
    </div>
  );
}
