import type { PublicGame } from '@/lib/server/partner-api';

/**
 * The slice of `PublicGame` a `GameCard` actually reads.
 *
 * Why a Pick: `GamesExplorer` is a client component and receives the whole
 * games catalog as a prop, so every field crosses the RSC boundary once per
 * game on top of the server-rendered markup. With the full DTO
 * (`related_categories`, hour histograms, timing stats, …) that single prop
 * was a 136 KB flight row on /games (2026-08-29 health check). Typing the
 * card on the Pick means a card that starts reading a new field fails to
 * COMPILE instead of silently rendering `undefined` from the pruned payload.
 *
 * Pure module (no 'use client'): server components may call `toGameCardGame`
 * before the boundary — a function exported from a client module cannot be
 * called from the server (AGENTS.md, day-counts lesson).
 */
export type GameCardGame = Pick<
  PublicGame,
  | 'category'
  | 'box_art_url'
  | 'live_streamer_count'
  | 'live_viewer_total'
  | 'hours_28d'
  | 'streamer_count'
  | 'top_streamers'
  | 'trend_delta_percent'
>;

export function toGameCardGame(game: PublicGame): GameCardGame {
  return {
    category: game.category,
    box_art_url: game.box_art_url,
    live_streamer_count: game.live_streamer_count,
    live_viewer_total: game.live_viewer_total,
    hours_28d: game.hours_28d,
    streamer_count: game.streamer_count,
    top_streamers: game.top_streamers,
    trend_delta_percent: game.trend_delta_percent,
  };
}
