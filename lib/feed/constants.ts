// Feed constants (M16) — values mirror the mobile app's M13 Home Feed
// (StreamHub: src/hooks/useHomeFeed.ts, src/services/feedService.ts,
// src/services/feedEventsService.ts). Keep in sync with the app.

/** "New for you" lookback when no last-seen watermark exists. */
export const RECENT_FALLBACK_HOURS = 24;
/** Up Next shows upcoming favorite slots within this window. */
export const UP_NEXT_WINDOW_HOURS = 12;
export const UP_NEXT_LIMIT = 5;
/** Highlights rail: max clips shown / max per streamer. */
export const CLIPS_LIMIT = 10;
export const CLIPS_PER_STREAMER = 2;
/** Discover: candidates fetched from the RPC vs. shown after diversity pass. */
export const DISCOVER_CANDIDATES = 12;
export const DISCOVER_SHOWN = 5;
export const DISCOVER_MAX_PER_CATEGORY = 2;
/** RPCs cap p_streamer_ids server-side at 100 — mirror it client-side. */
export const MAX_STREAMER_IDS = 100;

/** feed_events batching (parity with the app's feedEventsService). */
export const EVENTS_FLUSH_INTERVAL_MS = 30_000;
export const EVENTS_MAX_QUEUE = 50;

/** Last-seen watermark cookie (ISO timestamp, written client-side on leave). */
export const SEEN_COOKIE = 'st_feed_seen';
export const SEEN_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
