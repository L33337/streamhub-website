'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { LiveBadge } from '@/components/web/Badges';
import { WatchButtons } from '@/components/web/WatchButtons';
import { HeroNextStream } from '@/components/web/HeroNextStream';
import {
  LIVE_STATUS_REFRESH_MS,
  LIVE_STATUS_TIMEOUT_MS,
  liveStatusQueryPath,
  parseLiveStatusRows,
  type LiveStatus,
} from '@/lib/wiki-live';

/**
 * The wiki page's live / next-stream answer, corrected in the browser.
 *
 * The server renders today's markup from the ISR snapshot (SEO, no-JS, and
 * the hydration baseline); after mount ONE anon PostgREST read per page
 * (shared by both instances of this component via the module store below)
 * replaces it when the database disagrees. Every failure — missing env,
 * timeout, non-2xx, hidden streamer, malformed body — keeps the server
 * state: the island may only ever make the page more current, never blank.
 *
 * Plain `fetch`, no supabase-js: the library is not in the initial bundle
 * and must not join it for a 659-byte read. The anon key travels as a header
 * (the preflight is cached for an hour) rather than in the URL, so it never
 * lands in logs. Refreshes when the tab becomes visible again after 5 min;
 * no polling — the same slot does not move within a tab session.
 *
 * Contract, edge cases and the query itself: lib/wiki-live.ts.
 */

interface Entry {
  status: LiveStatus | null;
  /** Last ATTEMPT (not success): a failing endpoint is retried at most once
   *  per refresh window, never per event. */
  attemptedAt: number;
  inflight: Promise<void> | null;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

function refresh(streamerId: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return Promise.resolve();

  let entry = entries.get(streamerId);
  if (!entry) {
    entry = { status: null, attemptedAt: 0, inflight: null };
    entries.set(streamerId, entry);
  }
  if (entry.inflight) return entry.inflight;
  if (Date.now() - entry.attemptedAt < LIVE_STATUS_REFRESH_MS) return Promise.resolve();
  entry.attemptedAt = Date.now();

  const current = entry;
  current.inflight = (async () => {
    try {
      const res = await fetch(`${base}/rest/v1/${liveStatusQueryPath(streamerId, new Date())}`, {
        headers: { apikey: key },
        cache: 'no-store',
        signal: AbortSignal.timeout(LIVE_STATUS_TIMEOUT_MS),
      });
      if (!res.ok) return;
      const parsed = parseLiveStatusRows(await res.json(), new Date());
      if (!parsed) return;
      current.status = parsed;
      emit();
    } catch {
      // fail-soft: the server-rendered state stays
    } finally {
      current.inflight = null;
    }
  })();
  return current.inflight;
}

interface Props {
  streamerId: string;
  /** What the server rendered — the hydration baseline and the fallback. */
  initial: LiveStatus;
  twitchLogin: string | null;
  youtubeChannelId: string | null;
  locale: string;
  /** Profile page href; the pill deep-links into that day's section there. */
  profileHref: string;
  /** `lead`: live row OR pill under the H1. `section`: pill only, inside the
   *  "Next stream" section (which renders the pill even while live). */
  variant: 'lead' | 'section';
}

export function WikiLiveStatus({
  streamerId,
  initial,
  twitchLogin,
  youtubeChannelId,
  locale,
  profileHref,
  variant,
}: Props) {
  const fetched = useSyncExternalStore(
    subscribe,
    () => entries.get(streamerId)?.status ?? null,
    () => null,
  );
  const status = fetched ?? initial;

  useEffect(() => {
    void refresh(streamerId);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh(streamerId);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [streamerId]);

  const pill = status.nextSlot ? (
    <HeroNextStream
      nextSlot={status.nextSlot}
      language={locale}
      href={`${profileHref}#day-${status.nextSlot.start_time.slice(0, 10)}`}
      hideUncertainCategory
    />
  ) : null;

  if (variant === 'section') return pill;

  const content = status.isLive ? (
    <div className="flex flex-wrap items-center gap-3">
      <LiveBadge language={locale} />
      <WatchButtons
        twitchLogin={twitchLogin}
        youtubeChannelId={youtubeChannelId}
        grow={false}
        language={locale}
        className="flex flex-wrap gap-2"
      />
    </div>
  ) : (
    pill
  );
  if (!content && !(initial.isLive || initial.nextSlot)) return null;
  // min-h-9 reserves the row the server rendered, so a slot that passed
  // (client: nothing) or a pill → live swap does not move the summary.
  return <div className="mt-3 min-h-9">{content}</div>;
}
