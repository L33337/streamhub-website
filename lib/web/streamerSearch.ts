// Client-side service layer for the add-streamer flow (website port of the
// app's src/services/streamerSearchService.ts). Talks to the StreamHub
// `search-streamers` and `add-streamer` Edge Functions with the signed-in
// user's JWT — same raw-fetch pattern as components/web/twitch-import/
// useTwitchImport.ts (Authorization: Bearer only, no apikey header needed;
// both functions are deployed --no-verify-jwt and validate the JWT in code).
//
// No React in this module: all mapping/copy logic lives here so it is unit-
// testable in the repo's node-env vitest setup (no jsdom available).

// Query bounds enforced by the search-streamers Edge Function (the /search
// page itself allows up to 100 chars — callers must gate on these).
export const EXTERNAL_QUERY_MIN = 2;
export const EXTERNAL_QUERY_MAX = 50;

export type SearchPlatform = 'twitch' | 'youtube';

/** Unified result row from search-streamers (local DB + platform API). */
export interface ExternalSearchResult {
  existingStreamerId: string | null;
  isNew: boolean;
  displayName: string;
  platform: SearchPlatform;
  twitchLogin: string | null;
  twitchId: string | null;
  youtubeChannelId: string | null;
  avatarUrl: string | null;
  /** Always false for YouTube results — the search API has no live status. */
  isLive: boolean;
  gameName: string | null;
}

export interface AddStreamerParams {
  displayName: string;
  twitchId?: string;
  twitchLogin?: string;
  youtubeChannelId?: string;
  avatarUrl?: string | null;
  isLive?: boolean;
  gameName?: string;
}

export type AddStreamerErrorCode =
  | 'insufficient_followers'
  | 'subscriber_count_hidden_low_videos'
  | 'follower_check_unavailable'
  | 'channel_not_found';

export interface AddStreamerResult {
  success: boolean;
  streamer?: { id: string; name: string };
  alreadyExists?: boolean;
  noHistory?: boolean;
  mergedWithExisting?: boolean;
  error?: string;
  errorCode?: AddStreamerErrorCode;
  followerCount?: number;
  videoCount?: number;
  minThreshold?: number;
}

export interface AddStreamerResponse {
  status: number;
  result: AddStreamerResult;
}

/** Thrown on HTTP 401 — the session expired or was never valid. */
export class StreamerSearchAuthError extends Error {
  constructor() {
    super(ADD_STREAMER_COPY.errSessionExpired);
    this.name = 'StreamerSearchAuthError';
  }
}

// All flow copy centralized and English-only, matching the /search page and
// onboarding wizard (both hardcoded English today; only streamer pages carry
// a localized lexicon). Shaped so a future Record<UiLang, …> swap is
// mechanical.
export const ADD_STREAMER_COPY = {
  sectionTitleResults: (platform: SearchPlatform) =>
    platform === 'youtube' ? 'More from YouTube' : 'More from Twitch',
  sectionTitleNoResults: 'Don’t see them here?',
  sectionHint: (platform: SearchPlatform) =>
    `Add any ${platform === 'youtube' ? 'YouTube' : 'Twitch'} streamer — we’ll start tracking their schedule and predictions.`,
  pickSectionTitle: 'Not on Streamer Times yet',
  addButton: 'Add',
  addPending: 'Adding — this can take a minute…',
  addedLabel: 'Added',
  viewSchedule: 'View schedule →',
  tryAgain: 'Try again',
  signInAgain: 'Sign in again',
  searchingExternal: (platform: SearchPlatform) =>
    `Searching ${platform === 'youtube' ? 'YouTube' : 'Twitch'}…`,
  externalNoMatches: (platform: SearchPlatform) =>
    `Nothing found on ${platform === 'youtube' ? 'YouTube' : 'Twitch'} either.`,
  externalSearchFailed:
    'Streamer search failed — please try again in a moment.',
  noHistoryNotice: (name: string) =>
    `${name} was added! We haven’t found recent streams yet — predictions appear once they go live.`,
  errDailyLimit:
    'Daily limit reached — you can add up to 20 streamers per day. Try again tomorrow.',
  errSessionExpired: 'Your session expired — please sign in again.',
  errGeneric: 'Failed to add streamer. Please try again.',
} as const;

const MIN_YT_VIDEOS_HIDDEN_SUBS = 5;

export interface AddStreamerErrorInfo {
  message: string;
  /** False for verdict-style rejections (follower gate, daily limit). */
  retryable: boolean;
  /** True when the fix is re-authenticating, not retrying. */
  signIn?: boolean;
}

/**
 * Maps a failed AddStreamerResult (+ HTTP status) to user-facing copy.
 * Port of the app's friendlyAddStreamerError, extended with the 429
 * daily-limit and retryability semantics the website cards need.
 */
export function addStreamerErrorInfo(
  result: AddStreamerResult,
  status?: number,
): AddStreamerErrorInfo {
  if (status === 429) {
    return { message: result.error ?? ADD_STREAMER_COPY.errDailyLimit, retryable: false };
  }
  const threshold = result.minThreshold ?? 50;
  switch (result.errorCode) {
    case 'insufficient_followers': {
      const count = result.followerCount;
      const detail = typeof count === 'number' ? ` (currently ${count})` : '';
      return {
        message: `This streamer doesn’t meet the minimum of ${threshold} followers/subscribers yet${detail}.`,
        retryable: false,
      };
    }
    case 'subscriber_count_hidden_low_videos':
      return {
        message: `This YouTube channel hides its subscriber count and has fewer than ${MIN_YT_VIDEOS_HIDDEN_SUBS} videos, so we can’t add it.`,
        retryable: false,
      };
    case 'follower_check_unavailable':
      return {
        message: 'Could not verify follower count. Please try again in a minute.',
        retryable: true,
      };
    case 'channel_not_found':
      return {
        message: 'This channel could not be found on the platform anymore.',
        retryable: false,
      };
    default:
      return {
        message: result.error ?? ADD_STREAMER_COPY.errGeneric,
        retryable: true,
      };
  }
}

/** Stable identity for pending/added/error maps across re-searches. */
export function getResultKey(result: ExternalSearchResult): string {
  return result.twitchId ?? result.youtubeChannelId ?? result.displayName;
}

/**
 * Builds the add-streamer request body from a search result. Returns null for
 * malformed results (Twitch without id+login / YouTube without channel id) —
 * the edge function would 400 on those anyway.
 */
export function buildAddParams(
  result: ExternalSearchResult,
): AddStreamerParams | null {
  if (result.platform === 'twitch') {
    if (!result.twitchId || !result.twitchLogin) return null;
    return {
      displayName: result.displayName,
      twitchId: result.twitchId,
      twitchLogin: result.twitchLogin,
      avatarUrl: result.avatarUrl,
      isLive: result.isLive,
      gameName: result.gameName ?? undefined,
    };
  }
  if (!result.youtubeChannelId) return null;
  return {
    displayName: result.displayName,
    youtubeChannelId: result.youtubeChannelId,
    avatarUrl: result.avatarUrl,
  };
}

function functionsUrl(name: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`;
}

/**
 * Searches local DB + platform API via the search-streamers Edge Function.
 * Throws StreamerSearchAuthError on 401, Error on any other failure.
 */
export async function searchExternalStreamers(
  accessToken: string,
  query: string,
  platform: SearchPlatform,
): Promise<ExternalSearchResult[]> {
  const res = await fetch(functionsUrl('search-streamers'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, platform }),
  });
  if (res.status === 401) throw new StreamerSearchAuthError();
  let body: { success?: boolean; results?: ExternalSearchResult[]; error?: string };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw new Error(`Search failed (HTTP ${res.status})`);
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error ?? `Search failed (HTTP ${res.status})`);
  }
  return body.results ?? [];
}

/**
 * Calls the add-streamer Edge Function. Non-2xx JSON bodies are returned
 * structured (status + result) so errorCode/followerCount/daily-limit copy
 * survive — only 401 and network/parse failures throw. Safe to retry after a
 * dropped response: a duplicate add returns 200 alreadyExists.
 */
export async function addExternalStreamer(
  accessToken: string,
  params: AddStreamerParams,
): Promise<AddStreamerResponse> {
  const res = await fetch(functionsUrl('add-streamer'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  if (res.status === 401) throw new StreamerSearchAuthError();
  let result: AddStreamerResult;
  try {
    result = (await res.json()) as AddStreamerResult;
  } catch {
    throw new Error(`Add failed (HTTP ${res.status})`);
  }
  return { status: res.status, result };
}
