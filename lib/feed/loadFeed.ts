// Feed orchestrator (M16) — port of the app's useHomeFeed.load() (M13).
// Runs the section fetches in parallel with per-section error isolation
// (a failed section renders a retry row, never kills the feed), then applies
// the client-side glue: is_hidden filtering, status/dedupe, clip ranking,
// chip derivation.
//
// Works with both the server client (initial render in app/feed/page.tsx)
// and the browser client (FeedClient refresh) — favorites are re-fetched
// here so a refresh reflects favorite changes made in the meantime.
//
// The RANKINGS blocks and the Streamer Wiki are deliberately NOT loaded here:
// they read the Partner API from the server only, never change minute to
// minute, and would otherwise be re-fetched by every client refresh. They come
// from lib/server/feed-extras.ts as page props instead.

import type { SupabaseClient } from '@supabase/supabase-js';
import { listFavoriteStreamers } from '@/lib/supabase/favorites';
import { MORE_FAV_CLIPS_MAX } from './constants';
import type {
  FeedData,
  FeedSectionKey,
  StreamSlot,
  FeedRecentStream,
  FeedClip,
  TrendingCategory,
  UserInterestProfile,
  PredictionFunFact,
  StreamerReliability,
  ScheduleChange,
  FeedFunFact,
  StreamerBreak,
  NewStreamerCandidate,
  FeedEngagementStats,
  YouTubeUpload,
  TrendingGame,
  WeekLeaderboardEntry,
  VolatileFeed,
} from './types';
import type { FeedQuickFacts } from './quick-facts';
import { buildFeedQuickFacts } from './quick-facts';
import {
  fetchStreamSlots,
  fetchLiveFeaturedSlots,
  fetchRecentStreams,
  fetchClipsForStreamers,
  fetchTopClipsExcluding,
  fetchInterestProfile,
  fetchTrendingCategories,
  fetchPredictionFunFact,
  fetchScheduleReliability,
  fetchRecentScheduleChanges,
  fetchFanMoments,
  fetchStreamerBreaks,
  fetchNewStreamers,
  fetchHourHistograms,
  fetchPeakHistory,
  fetchEngagementStats,
  fetchYouTubeUploads,
  fetchTrendingGames,
  fetchHiddenStreamerIds,
  fetchFavoritesWeekHistory,
  fetchFeedQuickFacts,
} from './service';
import {
  deriveLiveAndUpNext,
  rankClipsSplit,
  orderClipsByPopularity,
  deriveChipCategories,
  typicalStartHourUtc,
  circularHourDiff,
  computeFavoritesWeekTotals,
  findPeakRecord,
  buildWeekLeaderboard,
  MISSED_HOUR_DIFF,
  MIN_WEEK_LEADERBOARD_ENTRIES,
} from './logic';

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
        favIds.length > 0 ? fetchStreamSlots(supabase, favIds, now) : Promise.resolve([]),
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

  // 2026-07-22: discovery clips for "More highlights" — top clips of the week
  // from non-favorited streamers, appended after the favorites' remainder.
  const otherClipsTask = (async (): Promise<{ clips: FeedClip[]; names: Record<string, string> }> => {
    try {
      return await fetchTopClipsExcluding(supabase, favIds, 7, 20);
    } catch {
      // Discovery clips silently absent — the favorites' remainder still shows.
      return { clips: [], names: {} };
    }
  })();

  // The interest profile outlived the Discover section it was introduced for
  // (removed 2026-08-03): the category chips rank by it, the announcement card
  // gates on its top affinity, and the interests-invite card reads
  // isDerivedFromSeedOnly. Failure is silent — those three degrade, the feed
  // does not.
  const profileTask = (async (): Promise<UserInterestProfile | null> => {
    try {
      return await fetchInterestProfile(supabase);
    } catch {
      return null;
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

  const newStreamersTask = (async (): Promise<NewStreamerCandidate[]> => {
    try {
      const rows = await fetchNewStreamers(supabase);
      const favSet = new Set(favIds);
      return rows.filter((row) => !favSet.has(row.streamerId));
    } catch {
      // Announcement card silently absent on failure.
      return [];
    }
  })();

  const engagementTask = (async (): Promise<FeedEngagementStats | null> => {
    try {
      return favIds.length > 0 ? await fetchEngagementStats(supabase) : null;
    } catch {
      // Ranking falls back to neutral terms.
      return null;
    }
  })();

  const uploadsTask = (async (): Promise<YouTubeUpload[]> => {
    try {
      return favIds.length > 0 ? await fetchYouTubeUploads(supabase, favIds) : [];
    } catch {
      // Rail silently absent on failure.
      return [];
    }
  })();

  const trendingGamesTask = (async (): Promise<TrendingGame[]> => {
    try {
      return await fetchTrendingGames(supabase);
    } catch {
      // Rail silently absent on failure.
      return [];
    }
  })();

  // ONE read of the favorites' week feeds BOTH the leaderboard and the Monday
  // recap. They render next to each other, so a shared source is what keeps
  // "32 h this week" from contradicting three rows that add up to 66 — see
  // computeFavoritesWeekTotals. Silent on failure; both sections hide.
  const weekTask = (async (): Promise<{
    leaderboard: WeekLeaderboardEntry[];
    recap: ReturnType<typeof computeFavoritesWeekTotals>;
  }> => {
    try {
      if (favIds.length === 0) return { leaderboard: [], recap: null };
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const rows = await fetchFavoritesWeekHistory(supabase, favIds, weekStart);
      const names: Record<string, string> = {};
      favorites.forEach((streamer) => {
        names[streamer.id] = streamer.name;
      });
      return {
        leaderboard: buildWeekLeaderboard(rows, weekStart, now, names),
        // Monday ritual (UTC on the server) — computed only when it renders.
        recap: now.getUTCDay() === 1 ? computeFavoritesWeekTotals(rows, weekStart, now) : null,
      };
    } catch {
      return { leaderboard: [], recap: null };
    }
  })();

  // "Your favorites in numbers". The RPC ships in a separate repo, so a
  // database without it must degrade to a hidden section rather than an error.
  const quickFactsTask = (async (): Promise<FeedQuickFacts | null> => {
    try {
      if (favIds.length === 0) return null;
      return buildFeedQuickFacts(await fetchFeedQuickFacts(supabase, favIds));
    } catch {
      return null;
    }
  })();

  const [
    slotsPair,
    recentResult,
    clipsResult,
    profile,
    trending,
    funFactResult,
    reliability,
    scheduleChangesResult,
    fanMomentsResult,
    breaksResult,
    newStreamers,
    engagement,
    uploadsResult,
    trendingGames,
    otherClipsResult,
    weekResult,
    quickFacts,
  ] = await Promise.all([
    slotsTask,
    recentTask,
    clipsTask,
    profileTask,
    trendingTask,
    funFactTask,
    reliabilityTask,
    scheduleChangesTask,
    fanMomentsTask,
    breaksTask,
    newStreamersTask,
    engagementTask,
    uploadsTask,
    trendingGamesTask,
    otherClipsTask,
    weekTask,
    quickFactsTask,
  ]);

  let [slots, featuredLiveSlots] = slotsPair;
  let recent = recentResult;
  let rawClips = clipsResult;
  let weekLeaderboard = weekResult.leaderboard;
  const weeklyRecap = weekResult.recap;
  let funFact = funFactResult;
  let scheduleChanges = scheduleChangesResult;
  let fanMoments = fanMomentsResult;
  let streamerBreaks = breaksResult;
  let uploads = uploadsResult;

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
      ...weekLeaderboard.map((e) => e.streamerId),
    ]);
    const hidden = await fetchHiddenStreamerIds(supabase, Array.from(candidateIds));
    if (hidden.size > 0) {
      slots = slots.filter((s) => !hidden.has(s.streamerId));
      featuredLiveSlots = featuredLiveSlots.filter((s) => !hidden.has(s.streamerId));
      recent = recent.filter((r) => !hidden.has(r.streamerId));
      rawClips = rawClips.filter((c) => !hidden.has(c.streamerId));
      // A hidden streamer must not survive as a leaderboard row either. The
      // section's own two-entry minimum is re-applied so filtering cannot leave
      // a "leaderboard" of one.
      weekLeaderboard = weekLeaderboard.filter((e) => !hidden.has(e.streamerId));
      if (weekLeaderboard.length < MIN_WEEK_LEADERBOARD_ENTRIES) weekLeaderboard = [];
      if (funFact && hidden.has(funFact.streamerId)) funFact = null;
      scheduleChanges = scheduleChanges.filter((c) => !hidden.has(c.streamerId));
      fanMoments = fanMoments.filter((f) => !hidden.has(f.streamerId));
      streamerBreaks = streamerBreaks.filter((b) => !hidden.has(b.streamerId));
      uploads = uploads.filter((u) => !hidden.has(u.streamerId));
    }
  } catch {
    // Filtering is polish, not correctness.
  }

  const recordsTask = (async (): Promise<{
    missedStream: FeedRecentStream | null;
    peakRecord: { streamerId: string; peak: number } | null;
  }> => {
    let missed: FeedRecentStream | null = null;
    let peak: { streamerId: string; peak: number } | null = null;
    try {
      const recentIds = [...new Set(recent.map((row) => row.streamerId))].slice(0, 10);
      if (recentIds.length > 0) {
        const [histograms, peaks] = await Promise.all([
          fetchHourHistograms(supabase, recentIds),
          fetchPeakHistory(supabase, recentIds),
        ]);
        for (const stream of recent) {
          const typical = typicalStartHourUtc(histograms.get(stream.streamerId));
          if (typical === null) continue;
          const startHour = new Date(stream.startedAt).getUTCHours();
          if (circularHourDiff(startHour, typical) > MISSED_HOUR_DIFF) {
            missed = stream;
            break;
          }
        }
        peak = findPeakRecord(peaks, now);
      }
    } catch {
      // Both cards silently absent on failure.
    }
    return { missedStream: missed, peakRecord: peak };
  })();

  const { missedStream, peakRecord } = await recordsTask;

  const { liveNow, upNext } = deriveLiveAndUpNext(slots, featuredLiveSlots, now);
  const { top: clips, more: favMoreClips } = rankClipsSplit(rawClips, engagement);
  // "More highlights" = favorites' remainder first, then discovery clips of
  // other streamers (server-side excluded, guarded again in case favorites
  // changed between fetches). The favorites' remainder is capped so the
  // discovery clips fit inside the UI's 20-clip window.
  const seenClipIds = new Set(rawClips.map((clip) => clip.id));
  const otherClips = otherClipsResult.clips.filter(
    (clip) => !favIdSet.has(clip.streamerId) && !seenClipIds.has(clip.id),
  );
  const moreClips =
    otherClips.length > 0
      ? [
          ...favMoreClips.slice(0, MORE_FAV_CLIPS_MAX),
          ...orderClipsByPopularity(otherClips, engagement),
        ]
      : favMoreClips;
  const chipCategories = deriveChipCategories(profile, liveNow, upNext, recent, clips);

  const avatarMap: Record<string, string> = {};
  favorites.forEach((streamer) => {
    if (streamer.avatar_url) avatarMap[streamer.id] = streamer.avatar_url;
  });
  featuredLiveSlots.forEach((slot) => {
    if (slot.avatarUrl && !avatarMap[slot.streamerId]) avatarMap[slot.streamerId] = slot.avatarUrl;
  });

  // Discovery-clip names first so favorites always win on collision.
  const nameMap: Record<string, string> = { ...otherClipsResult.names };
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
    trending,
    funFact,
    profile,
    reliabilityMap,
    scheduleChanges,
    fanMoments,
    streamerBreaks,
    newStreamers,
    weeklyRecap,
    missedStream,
    peakRecord,
    moreClips,
    uploads,
    trendingGames,
    weekLeaderboard,
    quickFacts,
    chipCategories,
    sectionErrors: errors,
    avatarMap,
    nameMap,
  };
}

/**
 * The volatile subset of loadFeed — only the sections that change minute to
 * minute (Live Now / Up Next / New for you). Used by the client auto-refresh
 * (5-min timer + tab-return): ~3 queries instead of loadFeed's ~20 queries +
 * 4 RPCs. Everything else in the feed (Discover, Highlights, info cards) is a
 * nightly/6h/weekly cache and stays untouched between full refreshes.
 *
 * Mirrors loadFeed's Live/Up-Next/Recent path exactly: same fetches, same
 * is_hidden filter (scoped to these sections), same avatar/name maps. The
 * client merges the result over the previous FeedData.
 */
export async function loadVolatileFeed(
  supabase: SupabaseClient,
  { since, now = new Date() }: LoadFeedOptions,
): Promise<VolatileFeed> {
  const favorites = await listFavoriteStreamers(supabase);
  const favIds = favorites.map((f) => f.id);
  const favIdSet = new Set(favIds);

  const errors: Partial<Record<FeedSectionKey, string>> = {};

  const slotsTask = (async (): Promise<[StreamSlot[], StreamSlot[]]> => {
    try {
      return await Promise.all([
        favIds.length > 0 ? fetchStreamSlots(supabase, favIds, now) : Promise.resolve([]),
        fetchLiveFeaturedSlots(supabase, favIdSet),
      ]);
    } catch (err) {
      errors.slots = err instanceof Error ? err.message : 'Failed to load streams';
      return [[], []];
    }
  })();

  const recentTask = (async (): Promise<FeedRecentStream[]> => {
    try {
      return favIds.length > 0 ? await fetchRecentStreams(supabase, favIds, since, 10) : [];
    } catch (err) {
      errors.recent = err instanceof Error ? err.message : 'Failed to load recent streams';
      return [];
    }
  })();

  const [slotsPair, recentResult] = await Promise.all([slotsTask, recentTask]);
  let [slots, featuredLiveSlots] = slotsPair;
  let recent = recentResult;

  // Hidden/test streamers never surface — same filter as loadFeed, scoped to
  // the three volatile sections. Failure is silent (polish, not correctness).
  try {
    const candidateIds = new Set<string>([
      ...slots.map((s) => s.streamerId),
      ...featuredLiveSlots.map((s) => s.streamerId),
      ...recent.map((r) => r.streamerId),
    ]);
    const hidden = await fetchHiddenStreamerIds(supabase, Array.from(candidateIds));
    if (hidden.size > 0) {
      slots = slots.filter((s) => !hidden.has(s.streamerId));
      featuredLiveSlots = featuredLiveSlots.filter((s) => !hidden.has(s.streamerId));
      recent = recent.filter((r) => !hidden.has(r.streamerId));
    }
  } catch {
    // Filtering is polish, not correctness.
  }

  const { liveNow, upNext } = deriveLiveAndUpNext(slots, featuredLiveSlots, now);

  // Same map construction as loadFeed (favorites + featured-live avatars).
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

  return { liveNow, upNext, recent, avatarMap, nameMap, sectionErrors: errors };
}
