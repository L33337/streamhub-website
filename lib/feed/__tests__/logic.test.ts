import { describe, it, expect } from 'vitest';
import {
  calculateStreamStatus,
  deduplicateStreamerSlots,
  sortSlotsByStartTime,
  deriveLiveAndUpNext,
  rankClips,
  rankClipsSplit,
  orderClipsByPopularity,
  diversityPass,
  deriveChipCategories,
  buildDiscoverReasonLabel,
  reorderDiscover,
  pickBestFunFact,
  resolveSince,
  formatViews,
  formatClipDuration,
  formatDuration,
  endedAgoLabel,
  buildReliabilityLabel,
  buildDiscoverStatsLine,
  applyDismissSuppression,
  typicalStartHourUtc,
  circularHourDiff,
  computeWeeklyRecap,
  findPeakRecord,
  formatPeak,
} from '../logic';
import { sanitizeThumbnailUrl, toPublicStreamSlot } from '../transforms';
import type {
  StreamSlot,
  FeedClip,
  DiscoverRecommendation,
  UserInterestProfile,
} from '../types';

const NOW = new Date('2026-07-07T12:00:00Z');

function slot(overrides: Partial<StreamSlot>): StreamSlot {
  return {
    id: 'slot-1',
    streamerId: 'streamer-1',
    streamerName: 'Streamer One',
    platforms: ['twitch'],
    streamTitle: 'Test stream',
    startTime: '2026-07-07T14:00:00Z',
    duration: 120,
    status: 'upcoming',
    confidence: 'high',
    isAiPrediction: false,
    visible: true,
    slotKind: 'regular',
    isUncertain: false,
    isAlwaysOn: false,
    ...overrides,
  };
}

function clip(overrides: Partial<FeedClip>): FeedClip {
  return {
    id: 'clip-1',
    streamerId: 'streamer-1',
    externalClipId: 'ClipSlug',
    title: 'Clip',
    url: 'https://clips.twitch.tv/x',
    viewCount: 100,
    clipCreatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function rec(overrides: Partial<DiscoverRecommendation>): DiscoverRecommendation {
  return {
    streamerId: 'rec-1',
    name: 'Rec One',
    platforms: ['twitch'],
    isAlwaysOn: false,
    pool: 'featured',
    score: 1,
    reason: 'popular',
    reasonCategoryFavorites: 0,
    ...overrides,
  };
}

function profile(overrides: Partial<UserInterestProfile>): UserInterestProfile {
  return {
    categoryAffinity: {},
    languages: [],
    activeHours: [],
    sizePrior: null,
    favoritesCount: 3,
    hasExplicitInterests: false,
    isDerivedFromSeedOnly: false,
    computedAt: NOW.toISOString(),
    ...overrides,
  };
}

describe('calculateStreamStatus', () => {
  const cases: Array<{
    name: string;
    slot: StreamSlot;
    expected: 'live' | 'upcoming' | 'offline';
  }> = [
    {
      name: 'trusts DB live status even before start',
      slot: slot({ status: 'live', startTime: '2026-07-07T18:00:00Z' }),
      expected: 'live',
    },
    {
      name: 'real slot within window is live',
      slot: slot({ startTime: '2026-07-07T11:00:00Z', duration: 120 }),
      expected: 'live',
    },
    {
      name: 'AI prediction within window stays upcoming',
      slot: slot({ startTime: '2026-07-07T11:00:00Z', duration: 120, isAiPrediction: true }),
      expected: 'upcoming',
    },
    {
      name: 'before start is upcoming',
      slot: slot({ startTime: '2026-07-07T14:00:00Z' }),
      expected: 'upcoming',
    },
    {
      name: 'after end is offline',
      slot: slot({ startTime: '2026-07-07T08:00:00Z', duration: 60 }),
      expected: 'offline',
    },
  ];

  cases.forEach(({ name, slot: s, expected }) => {
    it(name, () => {
      expect(calculateStreamStatus(s, NOW)).toBe(expected);
    });
  });
});

describe('deduplicateStreamerSlots', () => {
  it('keeps the real slot when a real and an AI slot overlap', () => {
    const real = slot({ id: 'real', startTime: '2026-07-07T14:00:00Z', duration: 120 });
    const ai = slot({
      id: 'ai',
      startTime: '2026-07-07T15:00:00Z',
      duration: 120,
      isAiPrediction: true,
    });
    const result = deduplicateStreamerSlots([ai, real]);
    expect(result.map((s) => s.id)).toEqual(['real']);
  });

  it('prefers live over upcoming when both are real and overlap', () => {
    const live = slot({ id: 'live', status: 'live', startTime: '2026-07-07T14:00:00Z' });
    const upcoming = slot({ id: 'up', status: 'upcoming', startTime: '2026-07-07T14:30:00Z' });
    const result = deduplicateStreamerSlots([upcoming, live]);
    expect(result.map((s) => s.id)).toEqual(['live']);
  });

  it('keeps non-overlapping slots of the same streamer', () => {
    const a = slot({ id: 'a', startTime: '2026-07-07T08:00:00Z', duration: 60 });
    const b = slot({ id: 'b', startTime: '2026-07-07T20:00:00Z', duration: 60 });
    expect(deduplicateStreamerSlots([a, b])).toHaveLength(2);
  });

  it('never removes slots across different streamers', () => {
    const a = slot({ id: 'a', streamerId: 's1' });
    const b = slot({ id: 'b', streamerId: 's2' });
    expect(deduplicateStreamerSlots([a, b])).toHaveLength(2);
  });
});

describe('deriveLiveAndUpNext', () => {
  it('appends live featured slots as suggestions after favorite live slots', () => {
    const favLive = slot({ id: 'fav', streamerId: 'fav-1', status: 'live' });
    const featured = slot({ id: 'feat', streamerId: 'feat-1', status: 'live' });
    const { liveNow } = deriveLiveAndUpNext([favLive], [featured], NOW);
    expect(liveNow.map((e) => [e.slot.streamerId, e.isFeaturedSuggestion])).toEqual([
      ['fav-1', false],
      ['feat-1', true],
    ]);
  });

  it('excludes featured slots whose streamer is already live in favorites', () => {
    const favLive = slot({ id: 'fav', streamerId: 'both', status: 'live' });
    const featured = slot({ id: 'feat', streamerId: 'both', status: 'live' });
    const { liveNow } = deriveLiveAndUpNext([favLive], [featured], NOW);
    expect(liveNow).toHaveLength(1);
  });

  it('excludes non-live featured slots', () => {
    const featured = slot({ id: 'feat', streamerId: 'feat-1', status: 'upcoming' });
    const { liveNow } = deriveLiveAndUpNext([], [featured], NOW);
    expect(liveNow).toHaveLength(0);
  });

  it('applies the -15min .. +12h window to Up Next', () => {
    const justMissed = slot({
      id: 'missed',
      streamerId: 's1',
      startTime: new Date(NOW.getTime() - 16 * 60_000).toISOString(),
      duration: 1, // already over -> offline, and outside window anyway
    });
    const graceStart = slot({
      id: 'grace',
      streamerId: 's2',
      startTime: new Date(NOW.getTime() - 14 * 60_000).toISOString(),
      duration: 120,
      isAiPrediction: true, // stays upcoming despite started window
    });
    const inWindow = slot({
      id: 'in',
      streamerId: 's3',
      startTime: new Date(NOW.getTime() + 11 * 3_600_000).toISOString(),
    });
    const outWindow = slot({
      id: 'out',
      streamerId: 's4',
      startTime: new Date(NOW.getTime() + 13 * 3_600_000).toISOString(),
    });
    const { upNext } = deriveLiveAndUpNext([justMissed, graceStart, inWindow, outWindow], [], NOW);
    expect(upNext.map((s) => s.id)).toEqual(['grace', 'in']);
  });

  it('caps Up Next at 5 slots, earliest first', () => {
    const slots = Array.from({ length: 7 }, (_, i) =>
      slot({
        id: `s-${i}`,
        streamerId: `streamer-${i}`,
        startTime: new Date(NOW.getTime() + (i + 1) * 3_600_000).toISOString(),
      }),
    );
    const { upNext } = deriveLiveAndUpNext(slots, [], NOW);
    expect(upNext.map((s) => s.id)).toEqual(['s-0', 's-1', 's-2', 's-3', 's-4']);
  });

  it('excludes cancelled slots from Up Next (M15/M16 deviation)', () => {
    const cancelled = slot({
      id: 'c',
      streamerId: 's1',
      slotKind: 'cancelled',
      isAiPrediction: true,
      startTime: new Date(NOW.getTime() + 2 * 3_600_000).toISOString(),
    });
    const { upNext } = deriveLiveAndUpNext([cancelled], [], NOW);
    expect(upNext).toHaveLength(0);
  });
});

describe('rankClips (2026-07-22 view-count round-robin)', () => {
  it('interleaves streamers round-robin, ordered by their most-viewed clip', () => {
    const clips = [
      clip({ id: 'x2', streamerId: 'x', viewCount: 2000 }),
      clip({ id: 'y1', streamerId: 'y', viewCount: 2500 }),
      clip({ id: 'x1', streamerId: 'x', viewCount: 3000 }),
      clip({ id: 'z1', streamerId: 'z', viewCount: 100 }),
    ];
    // streamer order by top clip: x (3000), y (2500), z (100);
    // pass 1 = each streamer's best, pass 2 = each streamer's second
    expect(rankClips(clips).map((c) => c.id)).toEqual(['x1', 'y1', 'z1', 'x2']);
  });

  it('orders within a streamer strictly by views — recency does not outrank clicks', () => {
    const fresh = clip({ id: 'fresh', streamerId: 's1', viewCount: 10 });
    const popular = clip({
      id: 'popular',
      streamerId: 's1',
      viewCount: 5000,
      clipCreatedAt: new Date(NOW.getTime() - 6 * 86_400_000).toISOString(),
    });
    expect(rankClips([fresh, popular]).map((c) => c.id)).toEqual(['popular', 'fresh']);
  });

  it('breaks view-count ties by newer clipCreatedAt, then id (deterministic)', () => {
    const older = clip({
      id: 'a-older',
      streamerId: 's1',
      viewCount: 100,
      clipCreatedAt: new Date(NOW.getTime() - 86_400_000).toISOString(),
    });
    const newer = clip({ id: 'b-newer', streamerId: 's2', viewCount: 100 });
    expect(rankClips([older, newer]).map((c) => c.id)).toEqual(['b-newer', 'a-older']);
  });

  it('caps at 2 clips per streamer in the rail; the third goes to the remainder', () => {
    const clips = [
      clip({ id: 'a', streamerId: 'same', viewCount: 3000 }),
      clip({ id: 'b', streamerId: 'same', viewCount: 2000 }),
      clip({ id: 'c', streamerId: 'same', viewCount: 1000 }),
      clip({ id: 'd', streamerId: 'other', viewCount: 1 }),
    ];
    const { top, more } = rankClipsSplit(clips);
    // round-robin: same's best, other's best, same's second — 'c' exceeds the cap
    expect(top.map((c) => c.id)).toEqual(['a', 'd', 'b']);
    expect(more.map((c) => c.id)).toEqual(['c']);
  });

  it('caps at 10 clips total', () => {
    const clips = Array.from({ length: 14 }, (_, i) =>
      clip({ id: `c-${i}`, streamerId: `s-${i}`, viewCount: 1000 - i }),
    );
    expect(rankClips(clips)).toHaveLength(10);
  });

  it('returns [] for empty input', () => {
    expect(rankClips([])).toEqual([]);
  });
});

describe('orderClipsByPopularity (More-highlights discovery pool)', () => {
  it('applies the full round-robin without rail caps', () => {
    const clips = [
      clip({ id: 'x3', streamerId: 'x', viewCount: 1000 }),
      clip({ id: 'x1', streamerId: 'x', viewCount: 3000 }),
      clip({ id: 'x2', streamerId: 'x', viewCount: 2000 }),
      clip({ id: 'y1', streamerId: 'y', viewCount: 500 }),
    ];
    // No 2-per-streamer cap here — all of x's clips appear, interleaved.
    expect(orderClipsByPopularity(clips).map((c) => c.id)).toEqual(['x1', 'y1', 'x2', 'x3']);
  });

  it('sinks dismissed content to the end, same as the rail', () => {
    const engagement = {
      categoryEngagement: {},
      dismissedStreamers: ['muted'],
      dismissedCategories: [],
    };
    const clips = [
      clip({ id: 'm1', streamerId: 'muted', viewCount: 9000 }),
      clip({ id: 'a1', streamerId: 'a', viewCount: 10 }),
    ];
    expect(orderClipsByPopularity(clips, engagement).map((c) => c.id)).toEqual(['a1', 'm1']);
  });
});

describe('diversityPass', () => {
  it('allows at most 2 per topCategory in the first pass', () => {
    const candidates = [
      rec({ streamerId: 'a1', topCategory: 'A', score: 9 }),
      rec({ streamerId: 'a2', topCategory: 'A', score: 8 }),
      rec({ streamerId: 'a3', topCategory: 'A', score: 7 }),
      rec({ streamerId: 'b1', topCategory: 'B', score: 6 }),
      rec({ streamerId: 'b2', topCategory: 'B', score: 5 }),
      rec({ streamerId: 'c1', topCategory: 'C', score: 4 }),
    ];
    const picked = diversityPass(candidates);
    expect(picked.map((r) => r.streamerId)).toEqual(['a1', 'a2', 'b1', 'b2', 'c1']);
  });

  it('treats null topCategory as unique keys (never collide)', () => {
    const candidates = [
      rec({ streamerId: 'n1', score: 9 }),
      rec({ streamerId: 'n2', score: 8 }),
      rec({ streamerId: 'n3', score: 7 }),
    ];
    expect(diversityPass(candidates)).toHaveLength(3);
  });

  it('backfills to 5 by score when the diversity cap leaves gaps', () => {
    const candidates = Array.from({ length: 6 }, (_, i) =>
      rec({ streamerId: `a-${i}`, topCategory: 'A', score: 10 - i }),
    );
    const picked = diversityPass(candidates);
    expect(picked.map((r) => r.streamerId)).toEqual(['a-0', 'a-1', 'a-2', 'a-3', 'a-4']);
  });

  it('returns everything when fewer than 5 candidates', () => {
    const candidates = [rec({ streamerId: 'x' }), rec({ streamerId: 'y', topCategory: 'B' })];
    expect(diversityPass(candidates)).toHaveLength(2);
  });
});

describe('deriveChipCategories', () => {
  it('orders top-6 profile categories by weight, then section categories, max 8', () => {
    const p = profile({
      categoryAffinity: {
        Low: 0.05,
        First: 0.9,
        Second: 0.8,
        Third: 0.7,
        Fourth: 0.6,
        Fifth: 0.5,
        Sixth: 0.4,
      },
    });
    const live = [{ slot: slot({ category: 'LiveCat' }), isFeaturedSuggestion: false }];
    const up = [slot({ category: 'UpCat' })];
    const result = deriveChipCategories(p, live, up, [], []);
    // Top-6 by weight (Low drops out), then LiveCat + UpCat, capped at 8.
    expect(result).toEqual([
      'First',
      'Second',
      'Third',
      'Fourth',
      'Fifth',
      'Sixth',
      'LiveCat',
      'UpCat',
    ]);
  });

  it('dedupes and trims section categories, no profile', () => {
    const live = [{ slot: slot({ category: ' FPS ' }), isFeaturedSuggestion: false }];
    const up = [slot({ category: 'FPS' })];
    const recent = [
      {
        id: 'r',
        streamerId: 's',
        streamerName: 'S',
        platform: 'twitch' as const,
        title: 't',
        category: '',
        startedAt: NOW.toISOString(),
        endedAt: NOW.toISOString(),
        durationMinutes: 60,
      },
    ];
    expect(deriveChipCategories(null, live, up, recent, [])).toEqual(['FPS']);
  });
});

describe('buildDiscoverReasonLabel', () => {
  it('covers all reason variants', () => {
    expect(
      buildDiscoverReasonLabel(
        rec({ reason: 'category', reasonCategory: 'Chess', reasonCategoryFavorites: 3 }),
      ),
    ).toBe('Streams Chess, like 3 of your favorites');
    expect(
      buildDiscoverReasonLabel(
        rec({ reason: 'category', reasonCategory: 'Chess', reasonCategoryFavorites: 1 }),
      ),
    ).toBe('Streams Chess');
    expect(buildDiscoverReasonLabel(rec({ reason: 'category' }))).toBe('Matches your interests');
    expect(buildDiscoverReasonLabel(rec({ reason: 'language' }))).toBe('Streams in your language');
    expect(buildDiscoverReasonLabel(rec({ reason: 'schedule' }))).toBe(
      'Live when you usually watch',
    );
    expect(buildDiscoverReasonLabel(rec({ reason: 'active' }))).toBe('Very active recently');
    expect(buildDiscoverReasonLabel(rec({ reason: 'popular' }))).toBe(
      'Popular on Streamer Times',
    );
  });
});

describe('reorderDiscover', () => {
  it('floats topCategory/reasonCategory matches to the top, keeps relative order', () => {
    const list = [
      rec({ streamerId: 'a', topCategory: 'X' }),
      rec({ streamerId: 'b', topCategory: 'Y' }),
      rec({ streamerId: 'c', reasonCategory: 'Y' }),
      rec({ streamerId: 'd', topCategory: 'Z' }),
    ];
    expect(reorderDiscover(list, 'Y').map((r) => r.streamerId)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('returns the same list when no chip is active (never filters)', () => {
    const list = [rec({ streamerId: 'a' }), rec({ streamerId: 'b' })];
    expect(reorderDiscover(list, null)).toBe(list);
    expect(reorderDiscover(list, 'Nope')).toHaveLength(2);
  });
});

describe('pickBestFunFact', () => {
  it('picks the row with the smallest |actual - predicted|', () => {
    const rows = [
      {
        streamer_id: 'far',
        predicted_start_time: '2026-07-06T12:00:00Z',
        actual_start_time: '2026-07-06T13:30:00Z',
        evaluated_at: '2026-07-06T20:00:00Z',
      },
      {
        streamer_id: 'near',
        predicted_start_time: '2026-07-05T12:00:00Z',
        actual_start_time: '2026-07-05T12:07:00Z',
        evaluated_at: null,
      },
    ];
    const best = pickBestFunFact(rows);
    expect(best).toEqual({
      streamerId: 'near',
      diffMinutes: 7,
      evaluatedAt: '2026-07-05T12:07:00Z', // falls back to actual_start_time
    });
  });

  it('returns null for empty input', () => {
    expect(pickBestFunFact([])).toBeNull();
  });
});

describe('resolveSince', () => {
  const fallback = new Date(NOW.getTime() - 24 * 3_600_000);

  it('falls back to now-24h without a cookie', () => {
    expect(resolveSince(undefined, NOW)).toEqual(fallback);
  });

  it('falls back on garbage cookies', () => {
    expect(resolveSince('not-a-date', NOW)).toEqual(fallback);
  });

  it('ignores cookies older than the 24h window', () => {
    const old = new Date(NOW.getTime() - 48 * 3_600_000).toISOString();
    expect(resolveSince(old, NOW)).toEqual(fallback);
  });

  it('uses a recent cookie', () => {
    const recent = new Date(NOW.getTime() - 2 * 3_600_000);
    expect(resolveSince(recent.toISOString(), NOW)).toEqual(recent);
  });

  it('clamps future cookies (clock skew) to now', () => {
    const future = new Date(NOW.getTime() + 3_600_000).toISOString();
    expect(resolveSince(future, NOW)).toEqual(NOW);
  });
});

describe('formatters', () => {
  it('formatViews', () => {
    expect(formatViews(999)).toBe('999');
    expect(formatViews(1000)).toBe('1.0K');
    expect(formatViews(9999)).toBe('10.0K');
    expect(formatViews(12_000)).toBe('12K');
    expect(formatViews(1_500_000)).toBe('1.5M');
  });

  it('formatClipDuration', () => {
    expect(formatClipDuration(undefined)).toBeNull();
    expect(formatClipDuration(0)).toBeNull();
    expect(formatClipDuration(65)).toBe('1:05');
    expect(formatClipDuration(59.6)).toBe('1:00');
  });

  it('formatDuration', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30m');
  });

  it('endedAgoLabel', () => {
    expect(endedAgoLabel(new Date(NOW.getTime() - 30 * 60_000).toISOString(), NOW)).toBe(
      'Ended 30m ago',
    );
    expect(endedAgoLabel(new Date(NOW.getTime() - 3 * 3_600_000).toISOString(), NOW)).toBe(
      'Ended 3h ago',
    );
    expect(endedAgoLabel(new Date(NOW.getTime() - 50 * 3_600_000).toISOString(), NOW)).toBe(
      'Ended 2d ago',
    );
    expect(endedAgoLabel(new Date(NOW.getTime() + 60_000).toISOString(), NOW)).toBe(
      'Ended 0m ago',
    );
  });

  it('sortSlotsByStartTime does not mutate its input', () => {
    const a = slot({ id: 'a', startTime: '2026-07-07T15:00:00Z' });
    const b = slot({ id: 'b', startTime: '2026-07-07T14:00:00Z' });
    const input = [a, b];
    const sorted = sortSlotsByStartTime(input);
    expect(sorted.map((s) => s.id)).toEqual(['b', 'a']);
    expect(input.map((s) => s.id)).toEqual(['a', 'b']);
  });
});

describe('transforms', () => {
  it('sanitizeThumbnailUrl skips Twitch size-template URLs', () => {
    expect(sanitizeThumbnailUrl('https://cdn.tw/x-{width}x{height}.jpg')).toBeUndefined();
    expect(sanitizeThumbnailUrl('https://cdn.tw/x-%{width}.jpg')).toBeUndefined();
    expect(sanitizeThumbnailUrl('https://cdn.tw/x-640x360.jpg')).toBe(
      'https://cdn.tw/x-640x360.jpg',
    );
    expect(sanitizeThumbnailUrl(null)).toBeUndefined();
  });

  it('toPublicStreamSlot maps to the Partner-API DTO shape', () => {
    const s = slot({
      id: 'id-1',
      streamerId: 'st-1',
      streamerName: 'Name',
      streamTitle: 'Title',
      category: 'FPS',
      status: 'live',
      isAiPrediction: true,
      isAlwaysOn: true,
      reasoning: 'because',
    });
    expect(toPublicStreamSlot(s)).toEqual({
      id: 'id-1',
      streamer_id: 'st-1',
      streamer_name: 'Name',
      platforms: ['twitch'],
      title: 'Title',
      category: 'FPS',
      thumbnail_url: null,
      avatar_url: null,
      start_time: s.startTime,
      duration_minutes: 120,
      status: 'live',
      is_predicted: true,
      confidence: 'high',
      is_always_on: true,
      twitch_login: null,
      youtube_channel_id: null,
      streamer_timezone: null,
      reasoning: 'because',
      copy_language: null,
      generic_reasoning: undefined,
    });
  });
});

describe('buildReliabilityLabel (M18 P2)', () => {
  it('returns null for unknown tier (cold start)', () => {
    expect(buildReliabilityLabel({ timeTier: 'unknown', medianStartDeviationMinutes: 5 })).toBeNull();
  });

  it('reliable with small deviation reads on time', () => {
    expect(buildReliabilityLabel({ timeTier: 'reliable', medianStartDeviationMinutes: 4 })).toBe(
      'Usually on time',
    );
    expect(buildReliabilityLabel({ timeTier: 'reliable', medianStartDeviationMinutes: null })).toBe(
      'Usually on time',
    );
  });

  it('reliable with >=10 min deviation names the direction', () => {
    expect(buildReliabilityLabel({ timeTier: 'reliable', medianStartDeviationMinutes: 18 })).toBe(
      'Usually ~18 min late',
    );
    expect(buildReliabilityLabel({ timeTier: 'reliable', medianStartDeviationMinutes: -12 })).toBe(
      'Usually ~12 min early',
    );
  });

  it('medium and unreliable have fixed labels', () => {
    expect(buildReliabilityLabel({ timeTier: 'medium', medianStartDeviationMinutes: null })).toBe(
      'Mostly on schedule',
    );
    expect(
      buildReliabilityLabel({ timeTier: 'unreliable', medianStartDeviationMinutes: null }),
    ).toBe('Schedule often shifts');
  });
});

describe('buildDiscoverStatsLine (M18 P2B)', () => {
  it('joins both parts when available', () => {
    expect(buildDiscoverStatsLine({ followerCount: 120_000, streams28d: 12 })).toBe(
      '≈120K followers · 12 streams in 28d',
    );
  });

  it('renders single parts alone', () => {
    expect(buildDiscoverStatsLine({ followerCount: 950, streams28d: null })).toBe('≈950 followers');
    expect(buildDiscoverStatsLine({ followerCount: null, streams28d: 1 })).toBe('1 stream in 28d');
  });

  it('returns null when nothing is available (incl. zero counts)', () => {
    expect(buildDiscoverStatsLine({ followerCount: null, streams28d: null })).toBeNull();
    expect(buildDiscoverStatsLine({ followerCount: 0, streams28d: 0 })).toBeNull();
  });
});

describe('M18 P2C card helpers', () => {
  it('typicalStartHourUtc picks the strongest bin, null on flat/invalid', () => {
    const histogram = new Array(24).fill(0);
    histogram[19] = 0.6;
    histogram[20] = 0.4;
    expect(typicalStartHourUtc(histogram)).toBe(19);
    expect(typicalStartHourUtc(new Array(24).fill(0))).toBeNull();
    expect(typicalStartHourUtc(null)).toBeNull();
    expect(typicalStartHourUtc([1, 2, 3])).toBeNull();
  });

  it('circularHourDiff wraps around midnight', () => {
    expect(circularHourDiff(23, 1)).toBe(2);
    expect(circularHourDiff(1, 23)).toBe(2);
    expect(circularHourDiff(12, 0)).toBe(12);
    expect(circularHourDiff(5, 5)).toBe(0);
  });

  it('computeWeeklyRecap aggregates hours + top category, null on thin weeks', () => {
    expect(
      computeWeeklyRecap([
        { durationMinutes: 120, category: 'LoL' },
        { durationMinutes: 180, category: 'LoL' },
        { durationMinutes: 60, category: 'Just Chatting' },
      ]),
    ).toEqual({ totalHours: 6, streams: 3, topCategory: 'LoL' });
    expect(computeWeeklyRecap([{ durationMinutes: 600, category: 'LoL' }])).toBeNull();
    expect(
      computeWeeklyRecap([
        { durationMinutes: 20, category: null },
        { durationMinutes: 20, category: null },
      ]),
    ).toBeNull();
  });

  it('findPeakRecord needs freshness, history and the noise floor', () => {
    const NOW2 = new Date('2026-07-09T12:00:00Z');
    const rows = [
      { streamerId: 's1', peakViewerCount: 900, endedAt: '2026-07-09T01:00:00Z' },
      { streamerId: 's1', peakViewerCount: 500, endedAt: '2026-06-20T01:00:00Z' },
      { streamerId: 's1', peakViewerCount: 700, endedAt: '2026-05-20T01:00:00Z' },
    ];
    expect(findPeakRecord(rows, NOW2)).toEqual({ streamerId: 's1', peak: 900 });
    // latest is not the max → no record
    expect(
      findPeakRecord(
        rows.map((row, index) => (index === 0 ? { ...row, peakViewerCount: 600 } : row)),
        NOW2,
      ),
    ).toBeNull();
    // stale latest → no record
    expect(
      findPeakRecord(
        rows.map((row, index) => (index === 0 ? { ...row, endedAt: '2026-07-01T01:00:00Z' } : row)),
        NOW2,
      ),
    ).toBeNull();
    // below noise floor → no record
    expect(
      findPeakRecord(
        rows.map((row) => ({ ...row, peakViewerCount: (row.peakViewerCount ?? 0) / 10 })),
        NOW2,
      ),
    ).toBeNull();
    // too little history → no record
    expect(findPeakRecord(rows.slice(0, 2), NOW2)).toBeNull();
  });

  it('formatPeak', () => {
    expect(formatPeak(950)).toBe('950');
    expect(formatPeak(8400)).toBe('8.4K');
    expect(formatPeak(1_200_000)).toBe('1.2M');
  });
});

describe('M18 P4 engagement ranking', () => {
  const engagement = {
    categoryEngagement: { Valorant: 8, 'Just Chatting': 2 },
    dismissedStreamers: ['streamer-bad'],
    dismissedCategories: ['Slots'],
  };

  it('category engagement no longer reorders Highlights (view-count round-robin)', () => {
    const clips = [
      clip({ id: 'jc', streamerId: 's1', category: 'Just Chatting', viewCount: 100 }),
      clip({ id: 'val', streamerId: 's2', category: 'Valorant', viewCount: 200 }),
    ];
    // 'Just Chatting' has less user engagement but more views on 'val' anyway;
    // flip the views and the order flips with them — engagement is ignored.
    expect(rankClips(clips, engagement)[0].id).toBe('val');
    const flipped = [
      clip({ id: 'jc', streamerId: 's1', category: 'Just Chatting', viewCount: 200 }),
      clip({ id: 'val', streamerId: 's2', category: 'Valorant', viewCount: 100 }),
    ];
    expect(rankClips(flipped, engagement)[0].id).toBe('jc');
  });

  it('sinks dismissed streamers to the end without hiding them', () => {
    const clips = [
      clip({ id: 'bad', streamerId: 'streamer-bad', viewCount: 9000 }),
      clip({ id: 'good', streamerId: 's1', viewCount: 100 }),
    ];
    const ranked = rankClips(clips, engagement);
    expect(ranked.map((c) => c.id)).toEqual(['good', 'bad']);
  });

  it('sinks clips of dismissed categories to the end without hiding them', () => {
    const clips = [
      clip({ id: 'slots', streamerId: 's1', category: 'Slots', viewCount: 9000 }),
      clip({ id: 'chess', streamerId: 's2', category: 'Chess', viewCount: 100 }),
    ];
    const ranked = rankClips(clips, engagement);
    expect(ranked.map((c) => c.id)).toEqual(['chess', 'slots']);
  });

  it('without engagement data the ordering is by views alone', () => {
    const clips = [
      clip({ id: 'small', streamerId: 's2', viewCount: 10 }),
      clip({ id: 'big', streamerId: 's1', viewCount: 10_000 }),
    ];
    expect(rankClips(clips).map((c) => c.id)).toEqual(['big', 'small']);
  });

  it('applyDismissSuppression sinks dismissed candidates below others', () => {
    const candidates = [
      rec({ streamerId: 'streamer-bad', score: 0.9 }),
      rec({ streamerId: 'ok', score: 0.6 }),
      rec({ streamerId: 'slots-fan', score: 0.7, topCategory: 'Slots' }),
    ];
    const ordered = applyDismissSuppression(candidates, engagement);
    expect(ordered.map((c) => c.streamerId)).toEqual(['ok', 'streamer-bad', 'slots-fan']);
    expect(ordered).toHaveLength(3);
  });

  it('applyDismissSuppression is a no-op without engagement data', () => {
    const candidates = [rec({ streamerId: 'a', score: 0.9 }), rec({ streamerId: 'b', score: 0.8 })];
    expect(applyDismissSuppression(candidates, null).map((c) => c.streamerId)).toEqual(['a', 'b']);
  });
});
