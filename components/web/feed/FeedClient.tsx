'use client';

// Client half of /feed (M16) — port of the app's Home screen composition
// (StreamHub app/(tabs)/home.tsx). The server component fetches the initial
// FeedData; this component owns interactivity: category chips (filter
// live/upNext/recent/clips, REORDER discover), feed-event logging, refresh
// (client refetch with the session-fixed `since`), the last-seen watermark
// cookie, and the 5-minute auto-refresh.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { loadFeed } from '@/lib/feed/loadFeed';
import {
  configureFeedEvents,
  logFeedEvent,
  flushFeedEvents,
} from '@/lib/feed/events';
import { SEEN_COOKIE, SEEN_COOKIE_MAX_AGE_SECONDS } from '@/lib/feed/constants';
import { reorderDiscover, buildReliabilityLabel } from '@/lib/feed/logic';
import { toPublicStreamSlot } from '@/lib/feed/transforms';
import type {
  FeedData,
  HomeLiveEntry,
  StreamSlot,
  FeedRecentStream,
  FeedClip,
  DiscoverRecommendation,
  StreamerReliability,
  ScheduleChange,
} from '@/lib/feed/types';
import { SlotCard } from '@/components/web/SlotCard';
import { FeedSectionHeader } from './FeedSectionHeader';
import { CategoryChips } from './CategoryChips';
import { LiveRail } from './LiveRail';
import { FeedVodCard } from './FeedVodCard';
import { ClipCard } from './ClipCard';
import { ClipLightbox } from './ClipLightbox';
import { DiscoverCard } from './DiscoverCard';
import { FeedInfoCard } from './FeedInfoCard';
import { SectionErrorRow, EmptyFavoritesCard, EmptyFilterHint } from './FeedStates';

const AUTO_REFRESH_MS = 5 * 60 * 1000;

// Canonical feed section order for impressions + scroll depth (M18 Phase 0).
// Keep in sync with the app's home.tsx and docs/feed-kpis.md (StreamHub repo).
const SECTION_ORDER = ['live', 'upnext', 'recent', 'clips', 'discover', 'info'] as const;
type FeedSection = (typeof SECTION_ORDER)[number];

function writeSeenCookie(): void {
  document.cookie = `${SEEN_COOKIE}=${encodeURIComponent(new Date().toISOString())}; path=/; max-age=${SEEN_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * Reasoning teaser + schedule-adherence pill under an Up Next card
 * (M18 Phase 2 — app parity: StreamCard teaser + ReliabilityBadge).
 */
function UpNextMeta({
  slot,
  reliability,
}: {
  slot: StreamSlot;
  reliability?: StreamerReliability;
}) {
  const label = reliability ? buildReliabilityLabel(reliability) : null;
  if (!slot.reasoning && !label) return null;

  const tierClass =
    reliability?.timeTier === 'reliable'
      ? 'bg-emerald-500/15 text-emerald-400'
      : reliability?.timeTier === 'medium'
        ? 'bg-amber-500/15 text-amber-400'
        : 'bg-rose-500/15 text-rose-400';

  return (
    <div className="mt-1 flex items-start justify-between gap-3 px-1">
      {slot.reasoning ? (
        <p className="line-clamp-2 text-xs italic text-text-muted">{slot.reasoning}</p>
      ) : (
        <span />
      )}
      {label && (
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${tierClass}`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Hover/focus-revealed "Not interested" affordance (M18 Phase 0 dismiss).
 * Web deviation from the app (documented): direct dismiss on click instead of
 * the app's long-press + confirm dialog.
 */
function Dismissable({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      {children}
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDismiss();
        }}
        aria-label="Not interested"
        title="Not interested"
        className="absolute right-2 top-2 z-10 hidden h-6 w-6 items-center justify-center rounded-full bg-black/70 text-text-secondary transition-colors hover:text-white group-focus-within:flex group-hover:flex"
      >
        <X size={12} />
      </button>
    </div>
  );
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
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [lightboxClip, setLightboxClip] = useState<FeedClip | null>(null);

  // "New for you" window is fixed per session — refreshes never shrink it.
  const sinceRef = useRef(new Date(sinceIso));
  const refreshingRef = useRef(false);
  const lastLoadedRef = useRef(Date.now());
  const loggedDiscoverIdsRef = useRef('');
  const tokenRef = useRef<string | null>(null);

  // Section impressions + scroll depth (M18 Phase 0): one impression per
  // section per page mount; the deepest section reached is logged on leave.
  const rootRef = useRef<HTMLDivElement>(null);
  const seenSectionsRef = useRef<Set<FeedSection>>(new Set());
  const lastLoggedDepthRef = useRef(-1);

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

  // Observe sections for impressions. Re-attached whenever the composition
  // changes (data refresh, chip filter, dismiss); the seen-set dedupes.
  // A tall section may never hit 50% visibility, so a ≥240px visible slice
  // counts as seen too.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.intersectionRatio < 0.5 && entry.intersectionRect.height < 240) return;
          const section = (entry.target as HTMLElement).dataset.feedSection as
            | FeedSection
            | undefined;
          if (!section || seenSectionsRef.current.has(section)) return;
          seenSectionsRef.current.add(section);
          logFeedEvent({ event: 'impression', itemType: 'section', itemId: section });
        });
      },
      { threshold: [0, 0.25, 0.5] },
    );
    root.querySelectorAll('[data-feed-section]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [data, selectedCategory, dismissedKeys]);

  // Persist the watermark + flush queued events when leaving the page —
  // pagehide (tab close/navigation), tab hidden, and client-side route away.
  useEffect(() => {
    const leave = () => {
      writeSeenCookie();
      let depth = -1;
      SECTION_ORDER.forEach((section, index) => {
        if (seenSectionsRef.current.has(section)) depth = index;
      });
      if (depth > lastLoggedDepthRef.current) {
        lastLoggedDepthRef.current = depth;
        logFeedEvent({ event: 'scroll_depth', itemType: 'section', itemId: SECTION_ORDER[depth] });
      }
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

  // M18 Phase 1: intercept the card's <a> click and play in the lightbox;
  // clips without a slug keep the link-out behavior.
  const handleClipOpen = useCallback(
    (clip: FeedClip, event: React.MouseEvent<HTMLAnchorElement>) => {
      logFeedEvent({
        event: 'clip_open',
        itemType: 'clip',
        itemId: clip.id,
        streamerId: clip.streamerId,
        category: clip.category,
      });
      if (clip.externalClipId) {
        event.preventDefault();
        setLightboxClip(clip);
      }
    },
    [],
  );

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

  // "Not interested" (M18 Phase 0): log dismiss, hide for this page mount.
  // Ranking suppression comes in Phase 4.
  const handleDismiss = useCallback(
    (
      key: string,
      itemType: 'clip' | 'discover' | 'info',
      ids: { itemId?: string; streamerId?: string; category?: string },
    ) => {
      logFeedEvent({ event: 'dismiss', itemType, ...ids });
      setDismissedKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    },
    [],
  );

  // Section composition — exact order and gating of the app's Home screen.
  const matches = (category?: string) =>
    selectedCategory === null || (category ?? '') === selectedCategory;

  const liveEntries = data.liveNow.filter((entry) => matches(entry.slot.category));
  const upNext = data.upNext.filter((slot) => matches(slot.category));
  const recent = data.recent.filter((stream) => matches(stream.category));
  const clips = data.clips.filter(
    (clip) => matches(clip.category) && !dismissedKeys.has(`clip:${clip.id}`),
  );
  const allFilteredEmpty =
    selectedCategory !== null &&
    liveEntries.length === 0 &&
    upNext.length === 0 &&
    recent.length === 0 &&
    clips.length === 0;
  const visibleDiscover = data.discover.filter(
    (rec) => !dismissedKeys.has(`discover:${rec.streamerId}`),
  );
  const orderedDiscover = reorderDiscover(visibleDiscover, selectedCategory);

  // M18 P2: "schedule change" cards — one per streamer, max 2 (app parity).
  const scheduleChangeCards: ScheduleChange[] = [];
  {
    const seenChangeStreamers = new Set<string>();
    for (const change of data.scheduleChanges) {
      if (scheduleChangeCards.length >= 2) break;
      if (seenChangeStreamers.has(change.streamerId)) continue;
      if (dismissedKeys.has(`info:schedule-${change.scheduleId}`)) continue;
      if (!data.nameMap[change.streamerId]) continue;
      seenChangeStreamers.add(change.streamerId);
      scheduleChangeCards.push(change);
    }
  }

  // M18 P2B: break cards (announced Twitch vacation) — max 2 (app parity).
  const breakCards = data.streamerBreaks
    .filter(
      (brk) =>
        !dismissedKeys.has(`info:break-${brk.streamerId}`) && !!data.nameMap[brk.streamerId],
    )
    .slice(0, 2);

  // M18 P2B: one "fan moment" card (sanitized transcript fun fact).
  const fanMoment = data.fanMoments.find(
    (fact) =>
      !dismissedKeys.has(`info:fanmoment-${fact.id}`) && !!data.nameMap[fact.streamerId],
  );
  const discoverTitle =
    data.profile?.isDerivedFromSeedOnly || !data.hasFavorites ? 'Popular right now' : 'Discover';
  const funFactName = data.funFact ? data.nameMap[data.funFact.streamerId] : undefined;
  const topTrend = data.trending[0];

  return (
    <div ref={rootRef}>
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
        <section aria-label="Live now" data-feed-section="live">
          <FeedSectionHeader title="Live Now" />
          <LiveRail entries={liveEntries} onSlotTap={handleLiveTap} />
        </section>
      ) : data.sectionErrors.slots ? (
        <SectionErrorRow label="Couldn't load live streams" onRetry={() => void refresh()} />
      ) : null}

      {upNext.length > 0 && (
        <section aria-label="Up next" data-feed-section="upnext">
          <FeedSectionHeader title="Up Next" actionLabel="See all" actionHref="/" />
          <ul className="flex flex-col gap-3">
            {upNext.map((slot) => (
              <li key={`upnext-${slot.id}`} onClickCapture={() => handleUpNextTap(slot)}>
                <SlotCard slot={toPublicStreamSlot(slot)} />
                <UpNextMeta slot={slot} reliability={data.reliabilityMap[slot.streamerId]} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {scheduleChangeCards.map((change) => {
        const when = new Date(change.scheduledStartTime).toLocaleString(undefined, {
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
        });
        return (
          <div key={`schedule-${change.scheduleId}`} data-feed-section="info">
            <Dismissable
              onDismiss={() =>
                handleDismiss(`info:schedule-${change.scheduleId}`, 'info', {
                  itemId: `schedule-${change.scheduleId}`,
                  streamerId: change.streamerId,
                  category: change.category ?? undefined,
                })
              }
            >
              <FeedInfoCard
                variant="schedule-change"
                headline={`${data.nameMap[change.streamerId]} cancelled a stream`}
                body={`The announced stream on ${when}${change.category ? ` (${change.category})` : ''} was taken off the schedule.`}
              />
            </Dismissable>
          </div>
        );
      })}

      {breakCards.map((brk) => {
        const until = new Date(brk.vacationUntil).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
        return (
          <div key={`break-${brk.streamerId}`} data-feed-section="info">
            <Dismissable
              onDismiss={() =>
                handleDismiss(`info:break-${brk.streamerId}`, 'info', {
                  itemId: `break-${brk.streamerId}`,
                  streamerId: brk.streamerId,
                })
              }
            >
              <FeedInfoCard
                variant="break"
                headline={`${data.nameMap[brk.streamerId]} is on break`}
                body={`Announced on Twitch: back around ${until}.`}
              />
            </Dismissable>
          </div>
        );
      })}

      {recent.length > 0 ? (
        <section aria-label="New for you" data-feed-section="recent">
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
        <section aria-label="Highlights" data-feed-section="clips">
          <FeedSectionHeader title="Highlights" />
          <ul
            className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Clip highlights"
          >
            {clips.map((clip) => (
              <li key={`clip-${clip.id}`} className="shrink-0">
                <Dismissable
                  onDismiss={() =>
                    handleDismiss(`clip:${clip.id}`, 'clip', {
                      itemId: clip.id,
                      streamerId: clip.streamerId,
                      category: clip.category,
                    })
                  }
                >
                  <ClipCard
                    clip={clip}
                    streamerName={data.nameMap[clip.streamerId]}
                    onOpen={(event) => handleClipOpen(clip, event)}
                  />
                </Dismissable>
              </li>
            ))}
          </ul>
        </section>
      ) : data.sectionErrors.clips ? (
        <SectionErrorRow label="Couldn't load highlights" onRetry={() => void refresh()} />
      ) : null}

      {fanMoment && (
        <div data-feed-section="info">
          <Dismissable
            onDismiss={() =>
              handleDismiss(`info:fanmoment-${fanMoment.id}`, 'info', {
                itemId: `fanmoment-${fanMoment.id}`,
                streamerId: fanMoment.streamerId,
              })
            }
          >
            <FeedInfoCard
              variant="fan-moment"
              headline={`From ${data.nameMap[fanMoment.streamerId]}'s last stream`}
              body={fanMoment.factText}
            />
          </Dismissable>
        </div>
      )}

      {allFilteredEmpty && <EmptyFilterHint />}

      {data.profile?.isDerivedFromSeedOnly &&
        data.hasFavorites &&
        !dismissedKeys.has('info:interests-invite') && (
          <div data-feed-section="info">
            <Dismissable
              onDismiss={() =>
                handleDismiss('info:interests-invite', 'info', { itemId: 'interests-invite' })
              }
            >
              <FeedInfoCard
                variant="interests-invite"
                headline="Make it yours"
                body="Pick a few categories you enjoy and your feed gets personal right away."
                ctaLabel="Choose interests"
                ctaHref="/feed/interests"
              />
            </Dismissable>
          </div>
        )}

      {orderedDiscover.length > 0 ? (
        <section aria-label={discoverTitle} data-feed-section="discover">
          <FeedSectionHeader title={discoverTitle} />
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {orderedDiscover.map((rec) => (
              <li key={`discover-${rec.streamerId}`}>
                <Dismissable
                  onDismiss={() =>
                    handleDismiss(`discover:${rec.streamerId}`, 'discover', {
                      streamerId: rec.streamerId,
                      category: rec.topCategory,
                    })
                  }
                >
                  <DiscoverCard
                    recommendation={rec}
                    stats={data.discoverStatsMap[rec.streamerId]}
                    onOpen={() => handleDiscoverOpen(rec)}
                    onFavoriteToggled={(nowFavorited) => handleDiscoverFavorite(rec, nowFavorited)}
                  />
                </Dismissable>
              </li>
            ))}
          </ul>
        </section>
      ) : data.sectionErrors.discover ? (
        <SectionErrorRow label="Couldn't load suggestions" onRetry={() => void refresh()} />
      ) : null}

      {data.funFact && funFactName && !dismissedKeys.has('info:funfact') && (
        <div data-feed-section="info">
          <Dismissable
            onDismiss={() => handleDismiss('info:funfact', 'info', { itemId: 'funfact' })}
          >
            <FeedInfoCard
              variant="funfact"
              headline="Prediction on point"
              body={`Our AI predicted ${funFactName}'s latest stream within ${data.funFact.diffMinutes} minute${data.funFact.diffMinutes === 1 ? '' : 's'}.`}
            />
          </Dismissable>
        </div>
      )}

      {topTrend && topTrend.deltaPercent > 0 && !dismissedKeys.has('info:trending') && (
        <div data-feed-section="info">
          <Dismissable
            onDismiss={() => handleDismiss('info:trending', 'info', { itemId: 'trending' })}
          >
            <FeedInfoCard
              variant="trending"
              headline={`${topTrend.category} is trending`}
              body={`${topTrend.streamersCurrent} streamers played it this week (+${topTrend.deltaPercent}% vs last week).`}
              ctaLabel="Filter feed"
              onCtaClick={() => handleSelectCategory(topTrend.category)}
            />
          </Dismissable>
        </div>
      )}

      {lightboxClip && (
        <ClipLightbox
          key={lightboxClip.id}
          clip={lightboxClip}
          streamerName={data.nameMap[lightboxClip.streamerId]}
          onClose={() => setLightboxClip(null)}
        />
      )}
    </div>
  );
}
