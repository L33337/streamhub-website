// Batched feed interaction logging (M16) — port of the app's
// feedEventsService.ts (M13, feed_events table).
//
// Fire-and-forget by design: events are queued in memory and flushed every
// 30s, when the queue fills, or when the user leaves the page. A failed
// flush DROPS the batch (no retry, no persistence) — losing analytics events
// must never cost the user anything.
//
// The flush POSTs straight to PostgREST with fetch({ keepalive: true }) so a
// leave-flush survives pagehide (supabase-js inserts would be aborted).
// RLS: feed_events is INSERT-only for authenticated users with
// auth.uid() = user_id; rows are deleted server-side after 90 days.
//
// Privacy: gated on user_feed_preferences.analytics_enabled (Settings
// toggle, default ON) — the flag arrives server-fresh via configureFeedEvents.

import { EVENTS_FLUSH_INTERVAL_MS, EVENTS_MAX_QUEUE } from './constants';
import type { FeedEventType, FeedItemType } from './types';

export interface FeedEventInput {
  event: FeedEventType;
  itemType: FeedItemType;
  itemId?: string;
  streamerId?: string;
  category?: string;
}

export interface FeedEventsConfig {
  userId: string;
  enabled: boolean;
  supabaseUrl: string;
  anonKey: string;
  /** Synchronous access-token accessor (caller caches via onAuthStateChange). */
  getAccessToken: () => string | null;
  /** Injectable for tests. */
  fetchFn?: typeof fetch;
}

interface QueuedEvent extends FeedEventInput {
  userId: string;
}

let config: FeedEventsConfig | null = null;
let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushing = false;

function ensureTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    void flushFeedEvents();
  }, EVENTS_FLUSH_INTERVAL_MS);
}

function stopTimerIfIdle(): void {
  if (flushTimer && queue.length === 0) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

/**
 * Binds the logger to the signed-in user. Pass null on sign-out — clears the
 * queue. A user change also clears the queue (never attribute another user's
 * events).
 */
export function configureFeedEvents(next: FeedEventsConfig | null): void {
  if (config?.userId !== next?.userId) {
    queue = [];
    stopTimerIfIdle();
  }
  config = next;
}

/** Flips the opt-out flag; disabling drops queued events immediately. */
export function setFeedEventsEnabled(enabled: boolean): void {
  if (!config) return;
  config = { ...config, enabled };
  if (!enabled) {
    queue = [];
    stopTimerIfIdle();
  }
}

/** Queues a feed interaction event. No-op when signed out or opted out. */
export function logFeedEvent(input: FeedEventInput): void {
  if (!config || !config.enabled) return;

  queue.push({ ...input, userId: config.userId });
  if (queue.length >= EVENTS_MAX_QUEUE) {
    void flushFeedEvents();
  } else {
    ensureTimer();
  }
}

/**
 * Sends all queued events. Failed batches are dropped. Pass keepalive=true
 * for leave flushes (pagehide/visibilitychange) so the request survives
 * navigation.
 */
export async function flushFeedEvents(keepalive = false): Promise<void> {
  if (flushing || queue.length === 0 || !config) {
    stopTimerIfIdle();
    return;
  }

  const token = config.getAccessToken();
  if (!token) {
    // No session token — drop (parity: analytics must never block or retry).
    queue = [];
    stopTimerIfIdle();
    return;
  }

  flushing = true;
  const batch = queue;
  queue = [];

  try {
    const rows = batch.map((event) => ({
      user_id: event.userId,
      event: event.event,
      item_type: event.itemType,
      item_id: event.itemId ?? null,
      streamer_id: event.streamerId ?? null,
      category: event.category ?? null,
    }));
    const fetchFn = config.fetchFn ?? fetch;
    await fetchFn(`${config.supabaseUrl}/rest/v1/feed_events`, {
      method: 'POST',
      keepalive,
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });
  } catch {
    // Dropped by design.
  } finally {
    flushing = false;
    stopTimerIfIdle();
  }
}

/** Test-only: reset module state between test cases. */
export function __resetFeedEventsForTests(): void {
  config = null;
  queue = [];
  flushing = false;
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

/** Test-only: current queue length. */
export function __getQueueLengthForTests(): number {
  return queue.length;
}
