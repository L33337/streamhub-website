// Feed orchestrator (M16) — port of the app's useHomeFeed.load() (M13).
// Runs the section fetches in parallel with per-section error isolation
// (a failed section renders a retry row, never kills the feed), then applies
// the client-side glue: is_hidden filtering, status/dedupe, clip ranking,
// discover diversity pass, chip derivation.
//
// Works with both the server client (initial render in app/feed/page.tsx)
// and the browser client (FeedClient refresh) — favorites are re-fetched
// here so a refresh reflects favorite changes made in the meantime.

import type { SupabaseClient } from '@supabase/supabase-js';
import { listFavoriteStreamers } from '@/lib/supabase/favorites';
import { DISCOVER_CANDIDATES } from './constants';
import type {
  FeedData,
  FeedSectionKey,
  StreamSlot,
  FeedRecentStream,
  FeedClip,
  DiscoverRecommendation,
  TrendingCategory,
  UserInterestProfile,
  PredictionFunFact,
  StreamerReliability,
  ScheduleChange,
  FeedFunFact,
  StreamerBreak,
  DiscoverStats,
} from './types';
import {
  fetchStreamSlots,
  fetchLiveFeaturedSlots,
  fetchRecentStreams,
  fetchClipsForStreamers,
  fetchInterestProfile,
  fetchDiscoverRecommendations,
  fetchTrendingCategories,
  fetchPredictionFunFact,
  fetchScheduleReliability,
  fetchRecentScheduleChanges,
  fetchFanMoments,
  fetchStreamerBreaks,
  fetchDiscoverStats,
  fetchHiddenStreamerIds,
} from './service';
import { deriveLiveAndUpNext, rankClips, diversityPass, deriveChipCategories } from './logic';

export interface LoadFeedOptions {
  /** "New for you" window start — session-fixed (see resolveSince). */
  since: Date;
  now?: Date;
}

export async function loadFeed(
  supabase: SupabaseClient,
  { since, now = new Date() }: LoadFeedOptions,
): Promise<FeedData> {
  const favorites = await listFavoriteStreamers(supabase);
  const favIds = favorites.map((f) => f.id);
  const favIdSet = new Set(favIds);

  const errors: Partial<Record<FeedSectionKey, string>> = {};
  const recordError = (key: FeedSectionKey, err: unknown, fallback: string) => {
    errors[key] = err instanceof Error ? err.message : fallback;
  };

  const slotsTask = (async (): Promise<[StreamSlot[], StreamSlot[]]> => {
    try {
      return await Promise.all([
        favIds.length > 0 ? fetchStreamSlots(supabase, favIds) : Promise.resolve([]),
        fetchLiveFeaturedSlots(supabase, favIdSet),
      ]);
    } catch (err) {
      recordError('slots', err, 'Failed to load streams');
      return [[], []];
    }
  })();

  const recentTask = (async (): Promise<FeedRecentStream[]> => {
    try {
      return favIds.length > 0 ? await fetchRecentStreams(supabase, favIds, since, 10) : [];
    } catch (err) {
      recordError('recent', err, 'Failed to load recent streams');
      return [];
    }
  })();

  const clipsTask = (async (): Promise<FeedClip[]> => {
    try {
      return favIds.length > 0 ? await fetchClipsForStreamers(supabase, favIds, 7, 40) : [];
    } catch (err) {
      recordError('clips', err, 'Failed to load highlights');
      return [];
    }
  })();

  const discoverTask = (async (): Promise<{
    profile: UserInterestProfile | null;
    discover: DiscoverRecommendation[];
  }> => {
    try {
      const profile = await fetchInterestProfile(supabase);
      const candidates = await fetchDiscoverRecommendations(supabase, profile, DISCOVER_CANDIDATES);
      return { profile, discover: diversityPass(candidates) };
    } catch (err) {
      recordError('discover', err, 'Failed to load suggestions');
      return { profile: null, discover: [] };
    }
  })();

  const trendingTask = (async (): Promise<TrendingCategory[]> => {
    try {
      return await fetchTrendingCategories(supabase, 5);
    } catch (err) {
      recordError('trending', err, 'Failed to load trends');
      return [];
    }
  })();

  const funFactTask = (async (): Promise<PredictionFunFact | null> => {
    try {
      return favIds.length > 0 ? await fetchPredictionFunFact(supabase, favIds) : null;
    } catch {
      // Fun fact is decorative — silently absent on failure.
      return null;
    }
  })();

  const reliabilityTask = (async (): Promise<StreamerReliability[]> => {
    try {
      return favIds.length > 0 ? await fetchScheduleReliability(supabase, favIds) : [];
    } catch {
      // Decorative badge — silently absent on failure.
      return [];
    }
  })();

  const scheduleChangesTask = (async (): Promise<ScheduleChange[]> => {
    try {
      return favIds.length > 0 ? await fetchRecentScheduleChanges(supabase, favIds) : [];
    } catch {
      // Decorative cards — silently absent on failure.
      return [];
    }
  })();

  const fanMomentsTask = (async (): Promise<FeedFunFact[]> => {
    try {
      return favIds.length > 0 ? await fetchFanMoments(supabase, favIds) : [];
    } catch {
      // Decorative card — silently absent on failure.
      return [];
    }
  })();

  const breaksTask = (async (): Promise<StreamerBreak[]> => {
    try {
      return favIds.length > 0 ? await fetchStreamerBreaks(supabase, favIds) : [];
    } catch {
      // Decorative cards — silently absent on failure.
      return [];
    }
  })();

  const [
    slotsPair,
    recentResult,
    clipsResult,
    discoverResult,
    trending,
    funFactResult,
    reliability,
    scheduleChangesResult,
    fanMomentsResult,
    breaksResult,
  ] = await Promise.all([
    slotsTask,
    recentTask,
    clipsTask,
    discoverTask,
    trendingTask,
    funFactTask,
    reliabilityTask,
    scheduleChangesTask,
    fanMomentsTask,
    breaksTask,
  ]);

  let [slots, featuredLiveSlots] = slotsPair;
  let recent = recentResult;
  let rawClips = clipsResult;
  let { discover } = discoverResult;
  const { profile } = discoverResult;
  let funFact = funFactResult;
  let scheduleChanges = scheduleChangesResult;
  let fanMoments = fanMomentsResult;
  let streamerBreaks = breaksResult;

  if (Object.keys(errors).length > 0) {
    console.warn('[feed] sections failed:', errors, `favorites=${favIds.length}`);
  }

  // Hidden/test streamers (streamers.is_hidden) never surface on the website.
  // Failure here is silent — sections render unfiltered rather than not at all.
  try {
    const candidateIds = new Set<string>([
      ...slots.map((s) => s.streamerId),
      ...featuredLiveSlots.map((s) => s.streamerId),
      ...recent.map((r) => r.streamerId),
      ...rawClips.map((c) => c.streamerId),
      ...discover.map((d) => d.streamerId),
    ]);
    const hidden = await fetchHiddenStreamerIds(supabase, Array.from(candidateIds));
    if (hidden.size > 0) {
      slots = slots.filter((s) => !hidden.has(s.streamerId));
      featuredLiveSlots = featuredLiveSlots.filter((s) => !hidden.has(s.streamerId));
      recent = recent.filter((r) => !hidden.has(r.streamerId));
      rawClips = rawClips.filter((c) => !hidden.has(c.streamerId));
      discover = discover.filter((d) => !hidden.has(d.streamerId));
      if (funFact && hidden.has(funFact.streamerId)) funFact = null;
      scheduleChanges = scheduleChanges.filter((c) => !hidden.has(c.streamerId));
      fanMoments = fanMoments.filter((f) => !hidden.has(f.streamerId));
      streamerBreaks = streamerBreaks.filter((b) => !hidden.has(b.streamerId));
    }
  } catch {
    // Filtering is polish, not correctness.
  }

  // M18 P2B: at-a-glance stats for the picked Discover cards (decorative).
  const discoverStatsMap: Record<string, DiscoverStats> = {};
  try {
    const stats = await fetchDiscoverStats(
      supabase,
      discover.map((rec) => rec.streamerId),
    );
    stats.forEach((entry) => {
      discoverStatsMap[entry.streamerId] = entry;
    });
  } catch {
    // Stats line silently absent on failure.
  }

  const { liveNow, upNext } = deriveLiveAndUpNext(slots, featuredLiveSlots, now);
  const clips = rankClips(rawClips, profile, now);
  const chipCategories = deriveChipCategories(profile, liveNow, upNext, recent, clips);

  const avatarMap: Record<string, string> = {};
  favorites.forEach((streamer) => {
    if (streamer.avatar_url) avatarMap[streamer.id] = streamer.avatar_url;
  });
  featuredLiveSlots.forEach((slot) => {
    if (slot.avatarUrl && !avatarMap[slot.streamerId]) avatarMap[slot.streamerId] = slot.avatarUrl;
  });

  const nameMap: Record<string, string> = {};
  favorites.forEach((streamer) => {
    nameMap[streamer.id] = streamer.name;
  });

  const reliabilityMap: Record<string, StreamerReliability> = {};
  reliability.forEach((entry) => {
    reliabilityMap[entry.streamerId] = entry;
  });

  return {
    hasFavorites: favIds.length > 0,
    liveNow,
    upNext,
    recent,
    clips,
    discover,
    trending,
    funFact,
    profile,
    reliabilityMap,
    scheduleChanges,
    fanMoments,
    streamerBreaks,
    discoverStatsMap,
    chipCategories,
    sectionErrors: errors,
    avatarMap,
    nameMap,
  };
}
