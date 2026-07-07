'use client';

// Client half of /feed (M16) — port of the app's Home screen composition
// (StreamHub app/(tabs)/home.tsx). The server component fetches the initial
// FeedData; this component owns interactivity: category chips (filter
// live/upNext/recent/clips, REORDER discover), feed-event logging, refresh
// (client refetch with the session-fixed `since`), the last-seen watermark
// cookie, and the 5-minute auto-refresh.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { loadFeed } from '@/lib/feed/loadFeed';
import {
  configureFeedEvents,
  logFeedEvent,
  flushFeedEvents,
} from '@/lib/feed/events';
import { SEEN_COOKIE, SEEN_COOKIE_MAX_AGE_SECONDS } from '@/lib/feed/constants';
import { reorderDiscover } from '@/lib/feed/logic';
import { toPublicStreamSlot } from '@/lib/feed/transforms';
import type {
  FeedData,
  HomeLiveEntry,
  StreamSlot,
  FeedRecentStream,
  FeedClip,
  DiscoverRecommendation,
} from '@/lib/feed/types';
import { SlotCard } from '@/components/web/SlotCard';
import { FeedSectionHeader } from './FeedSectionHeader';
import { CategoryChips } from './CategoryChips';
import { LiveRail } from './LiveRail';
import { FeedVodCard } from './FeedVodCard';
import { ClipCard } from './ClipCard';
import { DiscoverCard } from './DiscoverCard';
import { FeedInfoCard } from './FeedInfoCard';
import { SectionErrorRow, EmptyFavoritesCard, EmptyFilterHint } from './FeedStates';

const AUTO_REFRESH_MS = 5 * 60 * 1000;

function writeSeenCookie(): void {
  document.cookie = `${SEEN_COOKIE}=${encodeURIComponent(new Date().toISOString())}; path=/; max-age=${SEEN_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function FeedClient({
  initial,
  sinceIso,
  userId,
  analyticsEnabled,
}: {
  initial: FeedData;
  sinceIso: string;
  userId: string;
  analyticsEnabled: boolean;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [data, setData] = useState<FeedData>(initial);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // "New for you" window is fixed per session — refreshes never shrink it.
  const sinceRef = useRef(new Date(sinceIso));
  const refreshingRef = useRef(false);
  const lastLoadedRef = useRef(Date.now());
  const loggedDiscoverIdsRef = useRef('');
  const tokenRef = useRef<string | null>(null);

  // Cache the access token synchronously for the events module (the leave
  // flush cannot await getSession()).
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (active) tokenRef.current = sessionData.session?.access_token ?? null;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token ?? null;
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    configureFeedEvents({
      userId,
      enabled: analyticsEnabled,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      getAccessToken: () => tokenRef.current,
    });
  }, [userId, analyticsEnabled]);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    try {
      const next = await loadFeed(supabase, { since: sinceRef.current });
      setData(next);
      lastLoadedRef.current = Date.now();
    } catch (err) {
      // loadFeed isolates section failures internally; this only fires on
      // unexpected errors. Keep the current content.
      console.error('[feed] refresh failed:', err);
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [supabase]);

  // Persist the watermark + flush queued events when leaving the page —
  // pagehide (tab close/navigation), tab hidden, and client-side route away.
  useEffect(() => {
    const leave = () => {
      writeSeenCookie();
      void flushFeedEvents(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') leave();
    };
    window.addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', leave);
      document.removeEventListener('visibilitychange', onVisibility);
      leave();
    };
  }, []);

  // Auto-refresh every 5 minutes while visible; also refresh when returning
  // to a tab that has been hidden for 5+ minutes (app useAutoRefresh parity).
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, AUTO_REFRESH_MS);
    const onVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastLoadedRef.current >= AUTO_REFRESH_MS
      ) {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  // One impression per Discover recommendation set (CTR denominator).
  useEffect(() => {
    if (data.discover.length === 0) return;
    const key = data.discover.map((rec) => rec.streamerId).join(',');
    if (loggedDiscoverIdsRef.current === key) return;
    loggedDiscoverIdsRef.current = key;
    data.discover.forEach((rec) => {
      logFeedEvent({
        event: 'impression',
        itemType: 'discover',
        streamerId: rec.streamerId,
        category: rec.topCategory,
      });
    });
  }, [data.discover]);

  const handleSelectCategory = useCallback((category: string | null) => {
    setSelectedCategory(category);
    if (category) {
      logFeedEvent({ event: 'tap', itemType: 'chip', itemId: category, category });
    }
  }, []);

  const handleLiveTap = useCallback((entry: HomeLiveEntry) => {
    logFeedEvent({
      event: 'tap',
      itemType: 'live',
      itemId: entry.slot.id,
      streamerId: entry.slot.streamerId,
      category: entry.slot.category,
    });
  }, []);

  const handleUpNextTap = useCallback((slot: StreamSlot) => {
    logFeedEvent({
      event: 'tap',
      itemType: 'upcoming',
      itemId: slot.id,
      streamerId: slot.streamerId,
      category: slot.category,
    });
  }, []);

  const handleVodWatch = useCallback((stream: FeedRecentStream) => {
    logFeedEvent({
      event: 'watch_tap',
      itemType: 'vod',
      itemId: stream.id,
      streamerId: stream.streamerId,
      category: stream.category,
    });
  }, []);

  const handleClipOpen = useCallback((clip: FeedClip) => {
    logFeedEvent({
      event: 'clip_open',
      itemType: 'clip',
      itemId: clip.id,
      streamerId: clip.streamerId,
      category: clip.category,
    });
  }, []);

  const handleDiscoverOpen = useCallback((rec: DiscoverRecommendation) => {
    logFeedEvent({
      event: 'tap',
      itemType: 'discover',
      streamerId: rec.streamerId,
      category: rec.topCategory,
    });
  }, []);

  const handleDiscoverFavorite = useCallback(
    (rec: DiscoverRecommendation, nowFavorited: boolean) => {
      if (nowFavorited) {
        logFeedEvent({
          event: 'favorite_from_feed',
          itemType: 'discover',
          streamerId: rec.streamerId,
          category: rec.topCategory,
        });
      }
    },
    [],
  );

  // Section composition — exact order and gating of the app's Home screen.
  const matches = (category?: string) =>
    selectedCategory === null || (category ?? '') === selectedCategory;

  const liveEntries = data.liveNow.filter((entry) => matches(entry.slot.category));
  const upNext = data.upNext.filter((slot) => matches(slot.category));
  const recent = data.recent.filter((stream) => matches(stream.category));
  const clips = data.clips.filter((clip) => matches(clip.category));
  const allFilteredEmpty =
    selectedCategory !== null &&
    liveEntries.length === 0 &&
    upNext.length === 0 &&
    recent.length === 0 &&
    clips.length === 0;
  const orderedDiscover = reorderDiscover(data.discover, selectedCategory);
  const discoverTitle =
    data.profile?.isDerivedFromSeedOnly || !data.hasFavorites ? 'Popular right now' : 'Discover';
  const funFactName = data.funFact ? data.nameMap[data.funFact.streamerId] : undefined;
  const topTrend = data.trending[0];

  return (
    <div>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-white">My feed</h1>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          aria-label="Refresh feed"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-default bg-background-elevated text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan disabled:opacity-60"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : undefined} />
        </button>
      </header>

      {data.chipCategories.length > 0 && (
        <div className="mt-4">
          <CategoryChips
            categories={data.chipCategories}
            selectedCategory={selectedCategory}
            onSelect={handleSelectCategory}
          />
        </div>
      )}

      {!data.hasFavorites && <EmptyFavoritesCard />}

      {liveEntries.length > 0 ? (
        <section aria-label="Live now">
          <FeedSectionHeader title="Live Now" />
          <LiveRail entries={liveEntries} onSlotTap={handleLiveTap} />
        </section>
      ) : data.sectionErrors.slots ? (
        <SectionErrorRow label="Couldn't load live streams" onRetry={() => void refresh()} />
      ) : null}

      {upNext.length > 0 && (
        <section aria-label="Up next">
          <FeedSectionHeader title="Up Next" actionLabel="See all" actionHref="/" />
          <ul className="flex flex-col gap-3">
            {upNext.map((slot) => (
              <li key={`upnext-${slot.id}`} onClickCapture={() => handleUpNextTap(slot)}>
                <SlotCard slot={toPublicStreamSlot(slot)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 ? (
        <section aria-label="New for you">
          <FeedSectionHeader title="New for you" />
          <ul className="flex flex-col gap-3">
            {recent.map((stream) => (
              <li key={`vod-${stream.id}`}>
                <FeedVodCard stream={stream} onWatch={() => handleVodWatch(stream)} />
              </li>
            ))}
          </ul>
        </section>
      ) : data.sectionErrors.recent ? (
        <SectionErrorRow label="Couldn't load recent streams" onRetry={() => void refresh()} />
      ) : null}

      {clips.length > 0 ? (
        <section aria-label="Highlights">
          <FeedSectionHeader title="Highlights" />
          <ul
            className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Clip highlights"
          >
            {clips.map((clip) => (
              <li key={`clip-${clip.id}`} className="shrink-0">
                <ClipCard
                  clip={clip}
                  streamerName={data.nameMap[clip.streamerId]}
                  onOpen={() => handleClipOpen(clip)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : data.sectionErrors.clips ? (
        <SectionErrorRow label="Couldn't load highlights" onRetry={() => void refresh()} />
      ) : null}

      {allFilteredEmpty && <EmptyFilterHint />}

      {data.profile?.isDerivedFromSeedOnly && data.hasFavorites && (
        <FeedInfoCard
          variant="interests-invite"
          headline="Make it yours"
          body="Pick a few categories you enjoy and your feed gets personal right away."
          ctaLabel="Choose interests"
          ctaHref="/feed/interests"
        />
      )}

      {orderedDiscover.length > 0 ? (
        <section aria-label={discoverTitle}>
          <FeedSectionHeader title={discoverTitle} />
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {orderedDiscover.map((rec) => (
              <li key={`discover-${rec.streamerId}`}>
                <DiscoverCard
                  recommendation={rec}
                  onOpen={() => handleDiscoverOpen(rec)}
                  onFavoriteToggled={(nowFavorited) => handleDiscoverFavorite(rec, nowFavorited)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : data.sectionErrors.discover ? (
        <SectionErrorRow label="Couldn't load suggestions" onRetry={() => void refresh()} />
      ) : null}

      {data.funFact && funFactName && (
        <FeedInfoCard
          variant="funfact"
          headline="Prediction on point"
          body={`Our AI predicted ${funFactName}'s latest stream within ${data.funFact.diffMinutes} minute${data.funFact.diffMinutes === 1 ? '' : 's'}.`}
        />
      )}

      {topTrend && topTrend.deltaPercent > 0 && (
        <FeedInfoCard
          variant="trending"
          headline={`${topTrend.category} is trending`}
          body={`${topTrend.streamersCurrent} streamers played it this week (+${topTrend.deltaPercent}% vs last week).`}
          ctaLabel="Filter feed"
          onCtaClick={() => handleSelectCategory(topTrend.category)}
        />
      )}
    </div>
  );
}
