// Live/next-stream status for the wiki page's client island (perf round
// phase 4a, 2026-09-19). Pure and unit-tested (lib/__tests__/wiki-live.test.ts);
// the island in components/web/streamer/WikiLiveStatus.tsx only fetches and
// renders.
//
// WHY the browser asks Supabase directly (user decision 2026-09-19): the wiki
// route's ISR TTL moves to 24 h. Live/offline transitions purge only `en` +
// the streamer's language (W2.1 scoping), a lost purge is silent, and a
// predicted slot that simply passes purges nothing at all — so the HTML's
// pill can be a day old. One anon PostgREST read per page view (659 bytes,
// index scan 0.12 ms, 100–300 ms) corrects it after hydration. The server
// markup stays the SEO/no-JS answer; the island only overrides it when the
// database says otherwise.
//
// CONTRACT AGAINST DRIFT — this query is a hand-written mirror of two backend
// paths and must change with them:
//   - StreamHub `_shared/partner-schedules.ts` (`/v1/schedules` filters:
//     visible=true, streamers.is_hidden=false, status in [...], start_time
//     window, predictions + always-on included, no confidence floor) and
//     `_shared/partner-dto.ts` toPublicStreamSlot (is_predicted =
//     is_ai_prediction === true, platforms ?? [], category ?? null).
//   - RPC `get_streamer_activity` (migration 20260913224028):
//     is_live = last_known_status = 'live'.
// The selection itself is the shared pickNextRealSlot(), so the island can
// never name a different "next stream" than the server render did.

import { pickNextRealSlot, sevenDayKeys } from '@/lib/format/time';
import type { HeroNextSlot } from '@/components/web/HeroNextStream';

export interface LiveStatus {
  isLive: boolean;
  nextSlot: HeroNextSlot | null;
}

/** Same 7-day window the page's schedule fetch uses. */
export const LIVE_STATUS_WINDOW_MS = 7 * 86_400_000;
/** More than enough: the pill only needs the earliest non-cancelled slot. */
export const LIVE_STATUS_SLOT_LIMIT = 10;
/** Re-ask at most this often per streamer (mount + tab becoming visible). */
export const LIVE_STATUS_REFRESH_MS = 5 * 60_000;
/** Fail-soft budget; the SSR state stays on timeout. */
export const LIVE_STATUS_TIMEOUT_MS = 4_000;

const SLOT_COLUMNS = 'start_time,category,confidence,platforms,is_ai_prediction,slot_kind';

/**
 * PostgREST path + query (relative to `/rest/v1/`) for one streamer's live
 * flag and upcoming slots — one request via the embedded `stream_slots`
 * relation. An empty result means hidden/unknown streamer.
 */
export function liveStatusQueryPath(streamerId: string, now: Date): string {
  const from = now.toISOString();
  const to = new Date(now.getTime() + LIVE_STATUS_WINDOW_MS).toISOString();
  const params = [
    `id=eq.${encodeURIComponent(streamerId)}`,
    'is_hidden=eq.false',
    `select=${encodeURIComponent(`last_known_status,stream_slots(${SLOT_COLUMNS})`)}`,
    'stream_slots.visible=eq.true',
    'stream_slots.status=eq.upcoming',
    `stream_slots.start_time=gte.${encodeURIComponent(from)}`,
    `stream_slots.start_time=lte.${encodeURIComponent(to)}`,
    'stream_slots.order=start_time.asc',
    `stream_slots.limit=${LIVE_STATUS_SLOT_LIMIT}`,
  ];
  return `streamers?${params.join('&')}`;
}

const PLATFORMS = new Set(['twitch', 'youtube']);
const CONFIDENCES = new Set(['high', 'medium', 'low']);
const SLOT_KINDS = new Set(['regular', 'new', 'cancelled']);

function parseSlot(raw: unknown): HeroNextSlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.start_time !== 'string' || Number.isNaN(new Date(r.start_time).getTime())) {
    return null;
  }
  const platforms = Array.isArray(r.platforms)
    ? (r.platforms.filter((p): p is 'twitch' | 'youtube' => typeof p === 'string' && PLATFORMS.has(p)))
    : [];
  return {
    // Normalized like the API: the ISO form the page's day keys are cut from.
    start_time: new Date(r.start_time).toISOString(),
    category: typeof r.category === 'string' && r.category.length > 0 ? r.category : null,
    // Unknown confidence degrades to 'low' — the wiki then hides the category
    // (HeroNextStream hideUncertainCategory), the safe side.
    confidence:
      typeof r.confidence === 'string' && CONFIDENCES.has(r.confidence)
        ? (r.confidence as HeroNextSlot['confidence'])
        : 'low',
    platforms,
    is_predicted: r.is_ai_prediction === true,
    slot_kind:
      typeof r.slot_kind === 'string' && SLOT_KINDS.has(r.slot_kind)
        ? (r.slot_kind as HeroNextSlot['slot_kind'])
        : undefined,
  };
}

/**
 * Turns the PostgREST response into the island's state. Null when the
 * response is not the expected shape or names no visible streamer — the
 * caller keeps the server-rendered state in both cases.
 */
export function parseLiveStatusRows(rows: unknown, now: Date): LiveStatus | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0] as Record<string, unknown> | null;
  if (!row || typeof row !== 'object') return null;
  const slots = Array.isArray(row.stream_slots)
    ? row.stream_slots.map(parseSlot).filter((s): s is HeroNextSlot => s !== null)
    : [];
  return {
    isLive: row.last_known_status === 'live',
    nextSlot: pickNextRealSlot(slots, sevenDayKeys(now)),
  };
}
