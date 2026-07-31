'use client';

// Client half of /feed (M16) — port of the app's Home screen composition
// (StreamHub app/(tabs)/home.tsx). The server component fetches the initial
// FeedData; this component owns interactivity: category chips (filter
// live/upNext/recent/clips, REORDER discover), feed-event logging, refresh
// (client refetch with the session-fixed `since`), the last-seen watermark
// cookie, and the 5-minute auto-refresh.
//
// Feed UX round 2026-07-22 (website-only, no app counterpart yet):
// sticky chips, RailScroller affordances, dismiss-undo with delayed event
// logging, "updated ago" + new-live pill, Up Next day grouping + relative
// time + .ics export, inline info-card cap, 2-col density grids, lightbox
// playlist navigation, trending-game tiles → internal /game hubs.

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, X, CalendarPlus } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { loadFeed, loadVolatileFeed } from '@/lib/feed/loadFeed';
import { fetchRecentStreams } from '@/lib/feed/service';
import {
  configureFeedEvents,
  logFeedEvent,
  flushFeedEvents,
} from '@/lib/feed/events';
import { SEEN_COOKIE, SEEN_COOKIE_MAX_AGE_SECONDS } from '@/lib/feed/constants';
import {
  reorderDiscover,
  buildReliabilityLabel,
  formatPeak,
  deriveChipCategories,
  relativeStartLabel,
  groupUpNextSlots,
  updatedAgoLabel,
} from '@/lib/feed/logic';
import { downloadSlotIcs } from '@/lib/feed/ics';
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
  YouTubeUpload,
  TrendingGame,
} from '@/lib/feed/types';
import Image from 'next/image';
import { SlotCard } from '@/components/web/SlotCard';
import { UploadCard } from './UploadCard';
import { FeedSectionHeader } from './FeedSectionHeader';
import { CategoryChips } from './CategoryChips';
import { LiveRail } from './LiveRail';
import { FeedVodCard } from './FeedVodCard';
import { ClipCard } from './ClipCard';
import { ClipLightbox } from './ClipLightbox';
import { DiscoverCard } from './DiscoverCard';
import { FeedInfoCard } from './FeedInfoCard';
import { RailScroller } from './RailScroller';
import { FeedSnackbar } from './FeedSnackbar';
import { SectionErrorRow, EmptyFavoritesCard, EmptyFilterHint } from './FeedStates';
import { BriefingOverlay, type BriefingCard } from './BriefingOverlay';

const AUTO_REFRESH_MS = 5 * 60 * 1000;
/** Re-render cadence for relative-time labels (countdowns, "updated ago"). */
const TICK_MS = 30 * 1000;
/** Undo window for dismisses — the dismiss event is only logged after it. */
const UNDO_WINDOW_MS = 5 * 1000;
/** Max inline info cards per page view — the rest waits for the next visit. */
const MAX_INLINE_INFO_CARDS = 3;

// Canonical feed section order for impressions + scroll depth (M18 Phase 0).
// Keep in sync with the app's home.tsx and docs/feed-kpis.md (StreamHub repo).
const SECTION_ORDER = ['live', 'upnext', 'recent', 'clips', 'discover', 'info'] as const;
type FeedSection = (typeof SECTION_ORDER)[number];

function writeSeenCookie(): void {
  document.cookie = `${SEEN_COOKIE}=${encodeURIComponent(new Date().toISOString())}; path=/; max-age=${SEEN_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

interface SnackbarState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Meta row under an Up Next card: relative start time (client-only — depends
 * on the viewer's clock) + schedule-adherence pill + .ics calendar export.
 * The AI reasoning teaser is NOT rendered here — SlotCard already renders it
 * inside the card (2026-07-22 fix: it used to appear twice).
 */
function UpNextMeta({
  slot,
  reliability,
  nowMs,
}: {
  slot: StreamSlot;
  reliability?: StreamerReliability;
  /** Ticking timestamp; null until mounted (SSR renders no relative label). */
  nowMs: number | null;
}) {
  const label = reliability ? buildReliabilityLabel(reliability) : null;
  const rel = nowMs !== null ? relativeStartLabel(slot.startTime, new Date(nowMs)) : null;
  const isImminent =
    nowMs !== null && new Date(slot.startTime).getTime() - nowMs <= 60 * 60_000;

  const tierClass =
    reliability?.timeTier === 'reliable'
      ? 'bg-emerald-500/15 text-emerald-400'
      : reliability?.timeTier === 'medium'
        ? 'bg-amber-500/15 text-amber-400'
        : 'bg-rose-500/15 text-rose-400';

  return (
    <div className="mt-1 flex items-center justify-between gap-3 px-1">
      <span
        className={`flex items-center gap-1.5 text-xs font-semibold ${
          isImminent ? 'text-accent-cyan' : 'text-text-muted'
        }`}
      >
        {isImminent && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-accent-cyan motion-safe:animate-pulse"
          />
        )}
        {rel ?? ''}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {label && (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tierClass}`}>
            {label}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            downloadSlotIcs(slot);
            logFeedEvent({
              event: 'tap',
              itemType: 'upcoming',
              itemId: `ics:${slot.id}`,
              streamerId: slot.streamerId,
              category: slot.category,
            });
          }}
          aria-label={`Add ${slot.streamerName}'s stream to your calendar`}
          title="Add to calendar (.ics)"
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border-default text-text-muted transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
        >
          <CalendarPlus size={12} />
        </button>
      </span>
    </div>
  );
}

/**
 * Hover/focus-revealed "Not interested" affordance (M18 Phase 0 dismiss).
 * Web deviation from the app (documented): direct dismiss on click instead of
 * the app's long-press + confirm dialog. On touch devices (no hover) the
 * button is always visible — cards navigate on tap, so hover-reveal would
 * make dismissing impossible there.
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
        className="absolute right-2 top-2 z-10 hidden h-6 w-6 items-center justify-center rounded-full bg-black/70 text-text-secondary transition-colors hover:text-white group-focus-within:flex group-hover:flex [@media(pointer:coarse)]:flex"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function FeedClient({
  title = 'My Feed',
  initial,
  sinceIso,
  userId,
  analyticsEnabled,
  gameHubSlugs = {},
}: {
  /** Localized page heading (the <h1>); server-resolved from the page locale. */
  title?: string;
  initial: FeedData;
  sinceIso: string;
  userId: string;
  analyticsEnabled: boolean;
  /** Category name → /game/<slug> for games with a hub page (server-resolved). */
  gameHubSlugs?: Record<string, string>;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [data, setData] = useState<FeedData>(initial);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ clip: FeedClip; playlist: FeedClip[] } | null>(
    null,
  );

  // Hydration gate: relative-time labels and day grouping depend on the
  // VIEWER's clock/timezone, which the server render cannot know. Pre-mount
  // the feed renders without them (flat Up Next list, no countdowns).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 30s tick drives countdowns + the "updated ago" label.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => Date.now());
  const [newLiveCount, setNewLiveCount] = useState(0);
  const [srMessage, setSrMessage] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Dismiss events pending their undo window: key → cancel/commit handles.
  const pendingDismissRef = useRef<
    Map<string, { timeout: ReturnType<typeof setTimeout>; commit: () => void }>
  >(new Map());

  // M18 P7: Daily Briefing overlay + per-day seen state (localStorage).
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [briefingSeen, setBriefingSeen] = useState(true);
  useEffect(() => {
    try {
      setBriefingSeen(window.localStorage.getItem('st_briefing_seen') === new Date().toDateString());
    } catch {
      setBriefingSeen(false);
    }
  }, []);

  // M18 P3: "More" region — lower-ranked clips + Discover 6–12 are already in
  // FeedData; older VODs are fetched lazily on expand.
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreRecent, setMoreRecent] = useState<FeedRecentStream[]>([]);

  // "New for you" window is fixed per session — refreshes never shrink it.
  const sinceRef = useRef(new Date(sinceIso));
  const refreshingRef = useRef(false);
  const lastLoadedRef = useRef(Date.now());
  const loggedDiscoverIdsRef = useRef('');
  const tokenRef = useRef<string | null>(null);

  // Live streamer ids of the CURRENT data — lets the volatile refresh detect
  // freshly-live streamers for the "went live" pill.
  const liveIdsRef = useRef<Set<string>>(
    new Set(initial.liveNow.map((entry) => entry.slot.streamerId)),
  );
  useEffect(() => {
    liveIdsRef.current = new Set(data.liveNow.map((entry) => entry.slot.streamerId));
  }, [data.liveNow]);

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

  const showSnackbar = useCallback((next: SnackbarState, ttlMs = UNDO_WINDOW_MS) => {
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbar(next);
    snackbarTimerRef.current = setTimeout(() => setSnackbar(null), ttlMs);
  }, []);

  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    };
  }, []);

  // Manual refresh (button + section-error retries): re-runs the whole feed.
  const fullRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    try {
      const next = await loadFeed(supabase, { since: sinceRef.current });
      setData(next);
      lastLoadedRef.current = Date.now();
      setLastUpdatedAt(Date.now());
      setNewLiveCount(0);
      setSrMessage(`Feed updated at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      // loadFeed isolates section failures internally; this only fires on
      // unexpected errors. Keep the current content.
      console.error('[feed] refresh failed:', err);
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [supabase]);

  // Auto-refresh (5-min timer + tab-return): only the volatile sections
  // (Live Now / Up Next / New for you) change minute-to-minute — the rest is a
  // nightly/6h/weekly cache. Refetches ~3 queries instead of loadFeed's ~20
  // queries + 4 RPCs and merges them into the existing feed. Runs silently (no
  // spinner) since it is a background tick. Shares refreshingRef with
  // fullRefresh so the two can never overlap.
  const volatileRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const v = await loadVolatileFeed(supabase, { since: sinceRef.current });
      // "Went live" pill: streamers live now that weren't before this tick.
      // Only shown when the user has scrolled past the Live rail — at the top
      // the rail itself communicates the change.
      const prevLiveIds = liveIdsRef.current;
      const freshLive = v.liveNow.filter((entry) => !prevLiveIds.has(entry.slot.streamerId));
      if (freshLive.length > 0 && window.scrollY > 300) {
        setNewLiveCount(freshLive.length);
      }
      setData((prev) => ({
        ...prev,
        liveNow: v.liveNow,
        upNext: v.upNext,
        recent: v.recent,
        avatarMap: { ...prev.avatarMap, ...v.avatarMap },
        nameMap: { ...prev.nameMap, ...v.nameMap },
        // Chips reflect the visible sections — recompute from the merged
        // volatile sections + the unchanged profile/clips (pure, cheap).
        chipCategories: deriveChipCategories(
          prev.profile,
          v.liveNow,
          v.upNext,
          v.recent,
          prev.clips,
        ),
        sectionErrors: {
          ...prev.sectionErrors,
          slots: v.sectionErrors.slots,
          recent: v.sectionErrors.recent,
        },
      }));
      lastLoadedRef.current = Date.now();
      setLastUpdatedAt(Date.now());
    } catch (err) {
      console.error('[feed] volatile refresh failed:', err);
    } finally {
      refreshingRef.current = false;
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
      // Commit dismiss events still inside their undo window — leaving the
      // page forfeits the undo, and the event must not be lost.
      pendingDismissRef.current.forEach(({ timeout, commit }) => {
        clearTimeout(timeout);
        commit();
      });
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
      if (document.visibilityState === 'visible') void volatileRefresh();
    }, AUTO_REFRESH_MS);
    const onVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastLoadedRef.current >= AUTO_REFRESH_MS
      ) {
        void volatileRefresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [volatileRefresh]);

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
  // clips without a slug keep the link-out behavior. `sourceList` = the rail
  // the clip was opened from — its embeddable clips become the lightbox
  // playlist (prev/next navigation).
  const handleClipOpen = useCallback(
    (clip: FeedClip, event: React.MouseEvent<HTMLAnchorElement>, sourceList: FeedClip[]) => {
      logFeedEvent({
        event: 'clip_open',
        itemType: 'clip',
        itemId: clip.id,
        streamerId: clip.streamerId,
        category: clip.category,
      });
      if (clip.externalClipId) {
        event.preventDefault();
        setLightbox({
          clip,
          playlist: sourceList.filter((candidate) => !!candidate.externalClipId),
        });
      }
    },
    [],
  );

  const handleLightboxNavigate = useCallback((next: FeedClip) => {
    logFeedEvent({
      event: 'clip_open',
      itemType: 'clip',
      itemId: next.id,
      streamerId: next.streamerId,
      category: next.category,
    });
    setLightbox((prev) => (prev ? { ...prev, clip: next } : prev));
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
        // Reinforce the mental model: favorites drive the feed.
        showSnackbar({
          message: `Added ${rec.name} — their streams will show up in your feed.`,
        });
      }
    },
    [showSnackbar],
  );

  // M18 P5: upload tap → new tab (the card is an <a>); log like a VOD watch.
  const handleUploadOpen = useCallback((upload: YouTubeUpload) => {
    logFeedEvent({
      event: 'watch_tap',
      itemType: 'vod',
      itemId: upload.id,
      streamerId: upload.streamerId,
    });
  }, []);

  // M18 P5 / 2026-07-22: trending-game tap → our own /game/<slug> hub when
  // one exists (app parity — the app opens its in-app game hub since 07-22).
  // Fallbacks: chip filter when the category is in the feed, else the Twitch
  // directory in a new tab.
  const handleTrendingGameClick = useCallback(
    (game: TrendingGame) => {
      logFeedEvent({ event: 'tap', itemType: 'chip', itemId: game.gameName, category: game.gameName });
      const slug = gameHubSlugs[game.gameName];
      if (slug) {
        router.push(`/game/${slug}`);
        return;
      }
      if (data.chipCategories.includes(game.gameName)) {
        setSelectedCategory(game.gameName);
        return;
      }
      window.open(
        `https://www.twitch.tv/directory/game/${encodeURIComponent(game.gameName)}`,
        '_blank',
        'noopener,noreferrer',
      );
    },
    [data.chipCategories, gameHubSlugs, router],
  );

  // M18 P3: expand the "More" region (idempotent — the button disappears).
  const handleShowMore = useCallback(async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    logFeedEvent({ event: 'load_more', itemType: 'section', itemId: 'more' });
    try {
      const favIds = Object.keys(data.nameMap);
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const rows = favIds.length > 0 ? await fetchRecentStreams(supabase, favIds, since, 25) : [];
      setMoreRecent(rows);
    } catch {
      // Older VODs silently absent — clips/discover remainder still shows.
    } finally {
      setIsLoadingMore(false);
      setMoreExpanded(true);
    }
  }, [isLoadingMore, data.nameMap, supabase]);

  // "Not interested" (M18 Phase 0): hide immediately, but log the dismiss
  // only after the undo window — an undone dismiss must not feed the Phase-4
  // rank suppression. Leaving the page commits pending dismisses (see leave).
  const handleDismiss = useCallback(
    (
      key: string,
      itemType: 'clip' | 'discover' | 'info',
      ids: { itemId?: string; streamerId?: string; category?: string },
    ) => {
      setDismissedKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      const commit = () => {
        pendingDismissRef.current.delete(key);
        logFeedEvent({ event: 'dismiss', itemType, ...ids });
      };
      const timeout = setTimeout(commit, UNDO_WINDOW_MS);
      pendingDismissRef.current.set(key, { timeout, commit });
      showSnackbar({
        message: 'Hidden from your feed.',
        actionLabel: 'Undo',
        onAction: () => {
          const pending = pendingDismissRef.current.get(key);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingDismissRef.current.delete(key);
          }
          setDismissedKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
          setSnackbar(null);
        },
      });
    },
    [showSnackbar],
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

  // Up Next day grouping (client-only: buckets follow the viewer's timezone).
  const upNextGroups: Array<{ label: string | null; slots: StreamSlot[] }> = mounted
    ? groupUpNextSlots(upNext, new Date(nowTick))
    : upNext.length > 0
      ? [{ label: null, slots: upNext }]
      : [];

  // Live-gap bridge: nothing live (unfiltered!) but something coming up —
  // keep the top of the feed alive instead of silently dropping the section.
  const liveBridgeSlot =
    selectedCategory === null &&
    data.liveNow.length === 0 &&
    !data.sectionErrors.slots &&
    data.hasFavorites &&
    upNext.length > 0
      ? upNext[0]
      : null;
  const liveBridgeRel =
    liveBridgeSlot && mounted
      ? relativeStartLabel(liveBridgeSlot.startTime, new Date(nowTick))
      : null;

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

  // M18 P2C: "you might have missed" — only while that stream is visible above.
  const missed = data.missedStream;
  const showMissed =
    !!missed &&
    recent.some((stream) => stream.id === missed.id) &&
    !dismissedKeys.has(`info:missed-${missed.id}`) &&
    !!data.nameMap[missed.streamerId];

  // M18 P2C: Monday recap + 90-day record + interest-matched announcement.
  const recap = data.weeklyRecap && !dismissedKeys.has('info:recap') ? data.weeklyRecap : null;
  const record =
    data.peakRecord &&
    !dismissedKeys.has(`info:milestone-${data.peakRecord.streamerId}`) &&
    data.nameMap[data.peakRecord.streamerId]
      ? data.peakRecord
      : null;
  const topAffinity = new Set(
    Object.entries(data.profile?.categoryAffinity ?? {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([category]) => category),
  );
  const announcement = data.newStreamers.find(
    (candidate) =>
      candidate.topCategory !== null &&
      topAffinity.has(candidate.topCategory) &&
      !dismissedKeys.has(`info:newstreamer-${candidate.streamerId}`),
  );

  // M18 P7: Daily Briefing composition (app parity, min 2 cards).
  const briefingCards: BriefingCard[] = [];
  {
    const topClip = data.clips[0];
    if (topClip) {
      const clipStreamer = data.nameMap[topClip.streamerId];
      briefingCards.push({
        kind: 'clip',
        headline: "Last night's top clip",
        body: `${topClip.title ?? 'Untitled clip'}${clipStreamer ? ` — ${clipStreamer}` : ''}`,
        thumbnailUrl: topClip.thumbnailUrl,
        clipId: topClip.id,
      });
    }
    const moment = data.fanMoments.find((fact) => !!data.nameMap[fact.streamerId]);
    if (moment) {
      briefingCards.push({
        kind: 'fan-moment',
        headline: `From ${data.nameMap[moment.streamerId]}'s last stream`,
        body: moment.factText,
      });
    }
    if (data.upNext.length > 0) {
      briefingCards.push({
        kind: 'today',
        headline: 'Coming up today',
        lines: data.upNext.slice(0, 4).map(
          (slot) =>
            `${slot.streamerName} · ${new Date(slot.startTime).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}`,
        ),
      });
    }
    const changeLines: string[] = [];
    data.scheduleChanges.slice(0, 2).forEach((change) => {
      const name = data.nameMap[change.streamerId];
      if (name) {
        changeLines.push(
          `${name} cancelled ${new Date(change.scheduledStartTime).toLocaleDateString(undefined, {
            weekday: 'short',
          })}`,
        );
      }
    });
    data.streamerBreaks.slice(0, 2).forEach((brk) => {
      const name = data.nameMap[brk.streamerId];
      if (name) {
        changeLines.push(
          `${name} on break until ${new Date(brk.vacationUntil).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}`,
        );
      }
    });
    if (changeLines.length > 0) {
      briefingCards.push({ kind: 'changes', headline: 'Schedule changes', lines: changeLines });
    }
    if (data.weeklyRecap) {
      briefingCards.push({
        kind: 'recap',
        headline: 'Your week in streams',
        body: `Live ${data.weeklyRecap.totalHours}h across ${data.weeklyRecap.streams} streams${data.weeklyRecap.topCategory ? ` — top category: ${data.weeklyRecap.topCategory}` : ''}.`,
      });
    }
  }
  const briefingAvailable = briefingCards.length >= 2;
  const briefingThumb = briefingCards.find((card) => card.thumbnailUrl)?.thumbnailUrl;

  const openBriefing = () => {
    logFeedEvent({ event: 'story_open', itemType: 'info', itemId: 'briefing' });
    setBriefingSeen(true);
    try {
      window.localStorage.setItem('st_briefing_seen', new Date().toDateString());
    } catch {
      // Seen state is cosmetic.
    }
    setBriefingOpen(true);
  };

  // M18 P3: "More" region contents (dedupe/dismiss/chip filters apply).
  const moreClipsVisible = moreExpanded
    ? data.moreClips
        .filter((clip) => matches(clip.category) && !dismissedKeys.has(`clip:${clip.id}`))
        .slice(0, 20)
    : [];
  const shownRecentIds = new Set(data.recent.map((stream) => stream.id));
  const moreRecentVisible = moreExpanded
    ? moreRecent
        .filter((stream) => matches(stream.category) && !shownRecentIds.has(stream.id))
        .slice(0, 15)
    : [];
  const moreDiscoverVisible = moreExpanded
    ? data.moreDiscover.filter((rec) => !dismissedKeys.has(`discover:${rec.streamerId}`))
    : [];
  const discoverTitle =
    data.profile?.isDerivedFromSeedOnly || !data.hasFavorites ? 'Popular right now' : 'Discover';
  const funFactName = data.funFact ? data.nameMap[data.funFact.streamerId] : undefined;
  const topTrend = data.trending[0];

  // Inline info-card budget (2026-07-22): at most MAX_INLINE_INFO_CARDS info
  // cards per view, in render order — the feed should read as content with a
  // few notices, not a notification pile. The briefing overlay still carries
  // the full digest. Dismissing a card frees budget for the next candidate.
  const interestsInviteVisible =
    !!data.profile?.isDerivedFromSeedOnly &&
    data.hasFavorites &&
    !dismissedKeys.has('info:interests-invite');
  const funFactVisible = !!(data.funFact && funFactName) && !dismissedKeys.has('info:funfact');
  const trendingHintVisible =
    !!(topTrend && topTrend.deltaPercent > 0) && !dismissedKeys.has('info:trending');
  const inlineInfoCandidates: string[] = [
    ...scheduleChangeCards.map((change) => `info:schedule-${change.scheduleId}`),
    ...breakCards.map((brk) => `info:break-${brk.streamerId}`),
    ...(showMissed && missed ? [`info:missed-${missed.id}`] : []),
    ...(fanMoment ? [`info:fanmoment-${fanMoment.id}`] : []),
    ...(interestsInviteVisible ? ['info:interests-invite'] : []),
    ...(funFactVisible ? ['info:funfact'] : []),
    ...(trendingHintVisible ? ['info:trending'] : []),
    ...(recap ? ['info:recap'] : []),
    ...(record ? [`info:milestone-${record.streamerId}`] : []),
    ...(announcement ? [`info:newstreamer-${announcement.streamerId}`] : []),
  ];
  const visibleInfoKeys = new Set(inlineInfoCandidates.slice(0, MAX_INLINE_INFO_CARDS));

  return (
    <div ref={rootRef}>
      <p aria-live="polite" role="status" className="sr-only">
        {srMessage}
      </p>

      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <div className="flex items-center gap-3">
          {mounted && (
            <span
              className="text-[11px] text-text-muted"
              title="The feed refreshes automatically every 5 minutes"
            >
              {updatedAgoLabel(lastUpdatedAt, nowTick)}
            </span>
          )}
          <button
            type="button"
            onClick={() => void fullRefresh()}
            disabled={isRefreshing}
            aria-label="Refresh feed"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-default bg-background-elevated text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan disabled:opacity-60"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : undefined} />
          </button>
        </div>
      </header>

      {briefingAvailable && (
        <button
          type="button"
          onClick={openBriefing}
          className={`mt-4 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
            briefingSeen
              ? 'border-border-default bg-background-elevated opacity-75 hover:opacity-100'
              : 'border-accent-cyan bg-background-elevated glow-cyan hover:bg-background-highlight'
          }`}
        >
          {briefingThumb && (
            <span
              className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-full ${
                briefingSeen ? '' : 'ring-2 ring-accent-cyan ring-offset-2 ring-offset-background'
              }`}
            >
              <Image src={briefingThumb} alt="" fill unoptimized sizes="48px" className="object-cover" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block text-[15px] font-bold text-accent-cyan">Your day ▸</span>
            <span className="block text-xs text-text-secondary" suppressHydrationWarning>
              {briefingSeen
                ? 'Catch up again'
                : `${briefingCards.length} cards · what you missed & what's next`}
            </span>
          </span>
        </button>
      )}

      {data.chipCategories.length > 0 && (
        <div className="sticky top-[var(--header-height)] z-30 -mx-4 mt-4 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <RailScroller>
            <CategoryChips
              categories={data.chipCategories}
              selectedCategory={selectedCategory}
              onSelect={handleSelectCategory}
            />
          </RailScroller>
        </div>
      )}

      {!data.hasFavorites && <EmptyFavoritesCard />}

      {liveEntries.length > 0 ? (
        <section aria-label="Live now" data-feed-section="live">
          <FeedSectionHeader title="Live Now" count={liveEntries.length} live />
          <RailScroller>
            <LiveRail entries={liveEntries} onSlotTap={handleLiveTap} />
          </RailScroller>
        </section>
      ) : data.sectionErrors.slots ? (
        <SectionErrorRow label="Couldn't load live streams" onRetry={() => void fullRefresh()} />
      ) : liveBridgeSlot ? (
        <div className="mt-8 flex items-center gap-2.5 rounded-xl border border-border-default bg-background-elevated px-4 py-3 text-sm text-text-secondary">
          <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-full bg-text-muted" />
          <span>
            No one is live right now — next up:{' '}
            <span className="font-semibold text-text-primary">{liveBridgeSlot.streamerName}</span>
            {liveBridgeRel ? (
              <span className="text-text-muted"> · {liveBridgeRel.toLowerCase()}</span>
            ) : null}
          </span>
        </div>
      ) : null}

      {upNext.length > 0 && (
        <section aria-label="Up next" data-feed-section="upnext">
          <FeedSectionHeader
            title="Up Next"
            count={upNext.length}
            actionLabel="See all"
            actionHref="/program"
          />
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {upNextGroups.map((group, groupIndex) => (
              <Fragment key={group.label ?? 'all'}>
                {group.label && (
                  <li
                    className={`text-xs font-bold uppercase tracking-wider text-text-muted md:col-span-2 ${
                      groupIndex > 0 ? 'mt-2' : ''
                    }`}
                  >
                    {group.label}
                  </li>
                )}
                {group.slots.map((slot) => (
                  <li key={`upnext-${slot.id}`}>
                    <div onClickCapture={() => handleUpNextTap(slot)}>
                      <SlotCard slot={toPublicStreamSlot(slot)} compact />
                    </div>
                    <UpNextMeta
                      slot={slot}
                      reliability={data.reliabilityMap[slot.streamerId]}
                      nowMs={mounted ? nowTick : null}
                    />
                  </li>
                ))}
              </Fragment>
            ))}
          </ul>
        </section>
      )}

      {scheduleChangeCards
        .filter((change) => visibleInfoKeys.has(`info:schedule-${change.scheduleId}`))
        .map((change) => {
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

      {breakCards
        .filter((brk) => visibleInfoKeys.has(`info:break-${brk.streamerId}`))
        .map((brk) => {
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
          <FeedSectionHeader title="New for you" count={recent.length} />
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {recent.map((stream) => (
              <li key={`vod-${stream.id}`}>
                <FeedVodCard stream={stream} onWatch={() => handleVodWatch(stream)} />
              </li>
            ))}
          </ul>
        </section>
      ) : data.sectionErrors.recent ? (
        <SectionErrorRow label="Couldn't load recent streams" onRetry={() => void fullRefresh()} />
      ) : null}

      {showMissed && missed && visibleInfoKeys.has(`info:missed-${missed.id}`) && (
        <div data-feed-section="info">
          <Dismissable
            onDismiss={() =>
              handleDismiss(`info:missed-${missed.id}`, 'info', {
                itemId: `missed-${missed.id}`,
                streamerId: missed.streamerId,
                category: missed.category,
              })
            }
          >
            <FeedInfoCard
              variant="missed"
              headline={`You might have missed ${data.nameMap[missed.streamerId]}`}
              body={`Went live ${new Date(missed.startedAt).toLocaleString(undefined, {
                weekday: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })} — far off the usual streaming time.`}
              ctaLabel={missed.vodUrl ? 'Watch VOD' : undefined}
              ctaHref={missed.vodUrl}
            />
          </Dismissable>
        </div>
      )}

      {clips.length > 0 ? (
        <section aria-label="Highlights" data-feed-section="clips">
          <FeedSectionHeader title="Highlights" count={clips.length} />
          <RailScroller>
            <ul className="flex gap-3 pb-2" aria-label="Clip highlights">
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
                      onOpen={(event) => handleClipOpen(clip, event, clips)}
                    />
                  </Dismissable>
                </li>
              ))}
            </ul>
          </RailScroller>
        </section>
      ) : data.sectionErrors.clips ? (
        <SectionErrorRow label="Couldn't load highlights" onRetry={() => void fullRefresh()} />
      ) : null}

      {selectedCategory === null && data.uploads.length > 0 && (
        <section aria-label="New videos">
          <FeedSectionHeader title="New videos" />
          <RailScroller>
            <ul className="flex gap-3 pb-2" aria-label="Recent YouTube uploads">
              {data.uploads.map((upload) => (
                <li key={`upload-${upload.id}`} className="shrink-0">
                  <UploadCard
                    upload={upload}
                    streamerName={data.nameMap[upload.streamerId]}
                    onOpen={() => handleUploadOpen(upload)}
                  />
                </li>
              ))}
            </ul>
          </RailScroller>
        </section>
      )}

      {fanMoment && visibleInfoKeys.has(`info:fanmoment-${fanMoment.id}`) && (
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

      {allFilteredEmpty && <EmptyFilterHint onClear={() => handleSelectCategory(null)} />}

      {interestsInviteVisible && visibleInfoKeys.has('info:interests-invite') && (
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
        <SectionErrorRow label="Couldn't load suggestions" onRetry={() => void fullRefresh()} />
      ) : null}

      {funFactVisible && data.funFact && visibleInfoKeys.has('info:funfact') && (
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

      {trendingHintVisible && topTrend && visibleInfoKeys.has('info:trending') && (
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

      {selectedCategory === null && data.trendingGames.length > 0 && (
        <section aria-label="Big on Twitch right now">
          <FeedSectionHeader title="Big on Twitch right now" />
          <RailScroller>
            <ul className="flex gap-3 pb-2" aria-label="Trending Twitch categories">
              {data.trendingGames.map((game) => (
                <li key={`trending-game-${game.rank}`} className="w-24 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTrendingGameClick(game)}
                    className="block w-full text-left focus-visible:outline-none"
                    aria-label={`Trending on Twitch: ${game.gameName}, rank ${game.rank}`}
                  >
                    <div className="relative h-32 w-24 overflow-hidden rounded-lg bg-background-highlight transition-transform motion-safe:hover:scale-[1.03]">
                      {game.boxArtUrl ? (
                        <Image
                          src={game.boxArtUrl}
                          alt=""
                          fill
                          unoptimized
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : null}
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1 py-px text-[10px] font-bold text-white">
                        #{game.rank}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-text-secondary">
                      {game.gameName}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </RailScroller>
        </section>
      )}

      {recap && visibleInfoKeys.has('info:recap') && (
        <div data-feed-section="info">
          <Dismissable onDismiss={() => handleDismiss('info:recap', 'info', { itemId: 'recap' })}>
            <FeedInfoCard
              variant="recap"
              headline="Your week in streams"
              stats={[
                { value: `${recap.totalHours}h`, label: 'live time' },
                { value: String(recap.streams), label: 'streams' },
                ...(recap.topCategory
                  ? [{ value: recap.topCategory, label: 'top category' }]
                  : []),
              ]}
            />
          </Dismissable>
        </div>
      )}

      {record && visibleInfoKeys.has(`info:milestone-${record.streamerId}`) && (
        <div data-feed-section="info">
          <Dismissable
            onDismiss={() =>
              handleDismiss(`info:milestone-${record.streamerId}`, 'info', {
                itemId: `milestone-${record.streamerId}`,
                streamerId: record.streamerId,
              })
            }
          >
            <FeedInfoCard
              variant="milestone"
              headline={`${data.nameMap[record.streamerId]} hit a 90-day record`}
              body={`The latest stream peaked at ${formatPeak(record.peak)} viewers — the highest in three months.`}
            />
          </Dismissable>
        </div>
      )}

      {announcement && visibleInfoKeys.has(`info:newstreamer-${announcement.streamerId}`) && (
        <div data-feed-section="info">
          <Dismissable
            onDismiss={() =>
              handleDismiss(`info:newstreamer-${announcement.streamerId}`, 'info', {
                itemId: `newstreamer-${announcement.streamerId}`,
                streamerId: announcement.streamerId,
                category: announcement.topCategory ?? undefined,
              })
            }
          >
            <FeedInfoCard
              variant="new-streamer"
              headline={`New on Streamer Times: ${announcement.name}`}
              body={`Streams ${announcement.topCategory} — take a look and add them to your favorites.`}
              ctaLabel="View streamer"
              ctaHref={`/streamer/${announcement.streamerId}`}
            />
          </Dismissable>
        </div>
      )}

      {data.hasFavorites && !moreExpanded && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void handleShowMore()}
            disabled={isLoadingMore}
            className="rounded-full border border-border-default bg-background-elevated px-5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan disabled:opacity-60"
          >
            {isLoadingMore ? 'Loading…' : 'Show more'}
          </button>
        </div>
      )}

      {moreExpanded && moreClipsVisible.length > 0 && (
        <section aria-label="More highlights" data-feed-section="clips">
          <FeedSectionHeader title="More highlights" />
          <RailScroller>
            <ul className="flex gap-3 pb-2" aria-label="More clip highlights">
              {moreClipsVisible.map((clip) => (
                <li key={`clip-more-${clip.id}`} className="shrink-0">
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
                      onOpen={(event) => handleClipOpen(clip, event, moreClipsVisible)}
                    />
                  </Dismissable>
                </li>
              ))}
            </ul>
          </RailScroller>
        </section>
      )}

      {moreExpanded && moreRecentVisible.length > 0 && (
        <section aria-label="Earlier this week" data-feed-section="recent">
          <FeedSectionHeader title="Earlier this week" />
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {moreRecentVisible.map((stream) => (
              <li key={`vod-more-${stream.id}`}>
                <FeedVodCard stream={stream} onWatch={() => handleVodWatch(stream)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {moreExpanded && moreDiscoverVisible.length > 0 && (
        <section aria-label="More to discover" data-feed-section="discover">
          <FeedSectionHeader title="More to discover" />
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {moreDiscoverVisible.map((rec) => (
              <li key={`discover-more-${rec.streamerId}`}>
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
                    onOpen={() => handleDiscoverOpen(rec)}
                    onFavoriteToggled={(nowFavorited) => handleDiscoverFavorite(rec, nowFavorited)}
                  />
                </Dismissable>
              </li>
            ))}
          </ul>
        </section>
      )}

      {moreExpanded &&
        moreClipsVisible.length === 0 &&
        moreRecentVisible.length === 0 &&
        moreDiscoverVisible.length === 0 && (
          <p className="mt-6 text-center text-xs text-text-muted">You&apos;re all caught up.</p>
        )}

      {newLiveCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setNewLiveCount(0);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="glow-green fixed left-1/2 top-28 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-live/60 bg-background-highlight px-4 py-1.5 text-sm font-bold text-live shadow-lg shadow-black/40"
        >
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full bg-live motion-safe:animate-pulse"
          />
          {newLiveCount === 1 ? '1 streamer went live' : `${newLiveCount} streamers went live`}
        </button>
      )}

      {briefingOpen && (
        <BriefingOverlay
          cards={briefingCards}
          onClose={() => setBriefingOpen(false)}
          onWatchClip={(clipId) => {
            const clip = data.clips.find((candidate) => candidate.id === clipId);
            if (clip?.externalClipId) {
              setBriefingOpen(false);
              setLightbox({
                clip,
                playlist: data.clips.filter((candidate) => !!candidate.externalClipId),
              });
            } else if (clip) {
              setBriefingOpen(false);
              window.open(clip.url, '_blank', 'noopener,noreferrer');
            }
          }}
        />
      )}

      {lightbox && (
        <ClipLightbox
          key={lightbox.clip.id}
          clip={lightbox.clip}
          playlist={lightbox.playlist}
          streamerName={data.nameMap[lightbox.clip.streamerId]}
          onClose={() => setLightbox(null)}
          onNavigate={handleLightboxNavigate}
        />
      )}

      {snackbar && (
        <FeedSnackbar
          message={snackbar.message}
          actionLabel={snackbar.actionLabel}
          onAction={snackbar.onAction}
          onClose={() => {
            if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
            setSnackbar(null);
          }}
        />
      )}
    </div>
  );
}
