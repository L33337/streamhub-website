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
const AI_SLOT_ID_PATTERN = /^ai_slot_pred_(.+)_(\d{10,16})_\d{1,4}$/;

// Streamer ids are Twitch logins or URL-safe YouTube-derived slugs; anything
// else must not end up in a redirect path segment.
const SAFE_SLUG_PATTERN = /^[A-Za-z0-9_-]+$/;

export interface ParsedPredictionSlotId {
  /** Streamer slug embedded in the id — already validated as path-safe. */
  slug: string;
  /** Epoch-ms of the prediction RUN that minted the id (not the slot's start). */
  mintedAtMs: number;
}

export function parsePredictionSlotId(id: string): ParsedPredictionSlotId | null {
  const match = AI_SLOT_ID_PATTERN.exec(id);
  if (!match) return null;
  const slug = match[1];
  if (!SAFE_SLUG_PATTERN.test(slug)) return null;
  const mintedAtMs = Number(match[2]);
  if (!Number.isFinite(mintedAtMs)) return null;
  return { slug, mintedAtMs };
}

export function expiredPredictionStreamerSlug(id: string): string | null {
  return parsePredictionSlotId(id)?.slug ?? null;
}

/**
 * Age past which a prediction slot id CANNOT belong to a displayable slot, so
 * the request can be answered without touching the Partner API.
 *
 * The bound is derived, not guessed. The backend caps id REUSE at 10 days
 * (MAX_ID_REUSE_AGE_MS in _shared/slot-reconcile.ts), and a reused id is
 * attached to a slot at most one prediction horizon (~7 days) into the future.
 * A valid future slot's id is therefore never older than ~17 days; 21 leaves
 * margin. Measured 2026-08-17: live future slots peaked at 7.7 days of id age,
 * dead ones reached 105.
 *
 * ⚠️ Raising MAX_ID_REUSE_AGE_MS without raising this turns the shortcut into
 * a 308 for slots that are still alive. The two constants are one contract
 * across two repos.
 */
export const STALE_SLOT_ID_MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000;

/**
 * Streamer slug for an id that is provably dead from its age alone, else null.
 *
 * Deliberately conservative: "null" only means "cannot decide here", and the
 * caller falls back to the normal page render + Partner-API lookup. A younger
 * dead id still gets its 404→308 the expensive way; only the long tail that
 * crawlers keep re-requesting is short-circuited.
 */
export function staleSlotRedirectSlug(id: string, nowMs: number): string | null {
  const parsed = parsePredictionSlotId(id);
  if (!parsed) return null;
  return nowMs - parsed.mintedAtMs > STALE_SLOT_ID_MAX_AGE_MS ? parsed.slug : null;
}
