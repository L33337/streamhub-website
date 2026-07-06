/**
 * AI prediction slot ids embed the streamer slug:
 *   ai_slot_pred_<streamer_id>_<epoch_ms>_<index>
 *
 * Prediction rows are deleted/replaced on every prediction cycle, so old
 * links (crawlers, shared URLs) keep hitting 404s long after expiry — the
 * dominant source of Partner-API 404s (~3.7k/week as of 2026-07-06). When
 * the Partner API returns null for such an id, the embedded slug lets us
 * permanently redirect to the streamer page without any extra API call.
 *
 * The slug itself may contain underscores and digits, so the pattern anchors
 * on the trailing `_<epoch_ms>_<index>` pair (greedy slug match backtracks
 * past it). Real slot ids don't use the ai_slot_pred_ prefix and fall
 * through to the regular 404.
 */
const AI_SLOT_ID_PATTERN = /^ai_slot_pred_(.+)_\d{10,16}_\d{1,4}$/;

// Streamer ids are Twitch logins or URL-safe YouTube-derived slugs; anything
// else must not end up in a redirect path segment.
const SAFE_SLUG_PATTERN = /^[A-Za-z0-9_-]+$/;

export function expiredPredictionStreamerSlug(id: string): string | null {
  const match = AI_SLOT_ID_PATTERN.exec(id);
  if (!match) return null;
  const slug = match[1];
  return SAFE_SLUG_PATTERN.test(slug) ? slug : null;
}
