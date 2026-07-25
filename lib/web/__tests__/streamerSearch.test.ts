import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  addExternalStreamer,
  addStreamerErrorInfo,
  buildAddParams,
  getResultKey,
  searchExternalStreamers,
  StreamerSearchAuthError,
  ADD_STREAMER_COPY,
  type AddStreamerResult,
  type ExternalSearchResult,
} from '../streamerSearch';

function twitchResult(
  overrides: Partial<ExternalSearchResult> = {},
): ExternalSearchResult {
  return {
    existingStreamerId: null,
    isNew: true,
    displayName: 'CoolStreamer',
    platform: 'twitch',
    twitchLogin: 'coolstreamer',
    twitchId: '12345',
    youtubeChannelId: null,
    avatarUrl: 'https://example.com/a.png',
    isLive: true,
    gameName: 'Just Chatting',
    ...overrides,
  };
}

function youtubeResult(
  overrides: Partial<ExternalSearchResult> = {},
): ExternalSearchResult {
  return {
    existingStreamerId: null,
    isNew: true,
    displayName: 'TubeStreamer',
    platform: 'youtube',
    twitchLogin: null,
    twitchId: null,
    youtubeChannelId: 'UCabc',
    avatarUrl: null,
    isLive: false,
    gameName: null,
    ...overrides,
  };
}

describe('addStreamerErrorInfo', () => {
  const base: AddStreamerResult = { success: false };

  it('429 prefers the server message and is not retryable', () => {
    const info = addStreamerErrorInfo(
      { ...base, error: 'You’ve already added 20 streamers today.' },
      429,
    );
    expect(info.message).toBe('You’ve already added 20 streamers today.');
    expect(info.retryable).toBe(false);
  });

  it('429 without a server message falls back to the daily-limit copy', () => {
    const info = addStreamerErrorInfo(base, 429);
    expect(info.message).toBe(ADD_STREAMER_COPY.errDailyLimit);
    expect(info.retryable).toBe(false);
  });

  it('insufficient_followers includes threshold and count', () => {
    const info = addStreamerErrorInfo(
      {
        ...base,
        errorCode: 'insufficient_followers',
        followerCount: 12,
        minThreshold: 50,
      },
      400,
    );
    expect(info.message).toContain('50');
    expect(info.message).toContain('(currently 12)');
    expect(info.retryable).toBe(false);
  });

  it('insufficient_followers without a count omits the detail and defaults threshold', () => {
    const info = addStreamerErrorInfo(
      { ...base, errorCode: 'insufficient_followers' },
      400,
    );
    expect(info.message).toContain('50');
    expect(info.message).not.toContain('currently');
  });

  it('subscriber_count_hidden_low_videos is not retryable', () => {
    const info = addStreamerErrorInfo(
      { ...base, errorCode: 'subscriber_count_hidden_low_videos' },
      400,
    );
    expect(info.message).toContain('hides its subscriber count');
    expect(info.retryable).toBe(false);
  });

  it('follower_check_unavailable is retryable', () => {
    const info = addStreamerErrorInfo(
      { ...base, errorCode: 'follower_check_unavailable' },
      503,
    );
    expect(info.retryable).toBe(true);
  });

  it('channel_not_found is not retryable', () => {
    const info = addStreamerErrorInfo(
      { ...base, errorCode: 'channel_not_found' },
      400,
    );
    expect(info.message).toContain('could not be found');
    expect(info.retryable).toBe(false);
  });

  it('unknown failure uses the server error string when present', () => {
    const info = addStreamerErrorInfo({ ...base, error: 'Something broke' }, 500);
    expect(info.message).toBe('Something broke');
    expect(info.retryable).toBe(true);
  });

  it('unknown failure without a message falls back to generic copy', () => {
    const info = addStreamerErrorInfo(base, 500);
    expect(info.message).toBe(ADD_STREAMER_COPY.errGeneric);
    expect(info.retryable).toBe(true);
  });
});

describe('buildAddParams', () => {
  it('builds Twitch params with live status and game', () => {
    expect(buildAddParams(twitchResult())).toEqual({
      displayName: 'CoolStreamer',
      twitchId: '12345',
      twitchLogin: 'coolstreamer',
      avatarUrl: 'https://example.com/a.png',
      isLive: true,
      gameName: 'Just Chatting',
    });
  });

  it('omits gameName when null', () => {
    const params = buildAddParams(twitchResult({ gameName: null }));
    expect(params?.gameName).toBeUndefined();
  });

  it('builds YouTube params without live/game fields', () => {
    expect(buildAddParams(youtubeResult())).toEqual({
      displayName: 'TubeStreamer',
      youtubeChannelId: 'UCabc',
      avatarUrl: null,
    });
  });

  it('returns null for malformed results', () => {
    expect(buildAddParams(twitchResult({ twitchLogin: null }))).toBeNull();
    expect(buildAddParams(twitchResult({ twitchId: null }))).toBeNull();
    expect(buildAddParams(youtubeResult({ youtubeChannelId: null }))).toBeNull();
  });
});

describe('getResultKey', () => {
  it('prefers twitchId, then youtubeChannelId, then displayName', () => {
    expect(getResultKey(twitchResult())).toBe('12345');
    expect(getResultKey(youtubeResult())).toBe('UCabc');
    expect(
      getResultKey(youtubeResult({ youtubeChannelId: null })),
    ).toBe('TubeStreamer');
  });
});

describe('edge function fetchers', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function jsonResponse(status: number, body: unknown): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    } as unknown as Response;
  }

  describe('searchExternalStreamers', () => {
    it('POSTs query+platform with the bearer token and returns results', async () => {
      const results = [twitchResult()];
      fetchMock.mockResolvedValue(jsonResponse(200, { success: true, results }));
      const out = await searchExternalStreamers('tok', 'cool', 'twitch');
      expect(out).toEqual(results);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://proj.supabase.co/functions/v1/search-streamers',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
          body: JSON.stringify({ query: 'cool', platform: 'twitch' }),
        }),
      );
    });

    it('throws StreamerSearchAuthError on 401', async () => {
      fetchMock.mockResolvedValue(jsonResponse(401, { error: 'Authentication required' }));
      await expect(
        searchExternalStreamers('tok', 'cool', 'twitch'),
      ).rejects.toBeInstanceOf(StreamerSearchAuthError);
    });

    it('throws with the server error on failure responses', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(400, { success: false, error: 'Query too short' }),
      );
      await expect(
        searchExternalStreamers('tok', 'c', 'twitch'),
      ).rejects.toThrow('Query too short');
    });

    it('throws a generic error when the body is not JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('bad json')),
      } as unknown as Response);
      await expect(
        searchExternalStreamers('tok', 'cool', 'twitch'),
      ).rejects.toThrow('Search failed (HTTP 502)');
    });
  });

  describe('addExternalStreamer', () => {
    const params = {
      displayName: 'CoolStreamer',
      twitchId: '12345',
      twitchLogin: 'coolstreamer',
    };

    it('returns the structured result with status on success', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(201, {
          success: true,
          streamer: { id: 'coolstreamer', name: 'CoolStreamer' },
          noHistory: true,
        }),
      );
      const { status, result } = await addExternalStreamer('tok', params);
      expect(status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.streamer?.id).toBe('coolstreamer');
      expect(result.noHistory).toBe(true);
    });

    it('returns non-2xx bodies structured instead of throwing', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(400, {
          success: false,
          errorCode: 'insufficient_followers',
          followerCount: 3,
          minThreshold: 50,
        }),
      );
      const { status, result } = await addExternalStreamer('tok', params);
      expect(status).toBe(400);
      expect(result.errorCode).toBe('insufficient_followers');
      expect(result.followerCount).toBe(3);
    });

    it('treats 200 alreadyExists as a normal structured response', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          success: true,
          alreadyExists: true,
          streamer: { id: 'existing-id', name: 'CoolStreamer' },
        }),
      );
      const { result } = await addExternalStreamer('tok', params);
      expect(result.alreadyExists).toBe(true);
      expect(result.streamer?.id).toBe('existing-id');
    });

    it('throws StreamerSearchAuthError on 401', async () => {
      fetchMock.mockResolvedValue(jsonResponse(401, {}));
      await expect(addExternalStreamer('tok', params)).rejects.toBeInstanceOf(
        StreamerSearchAuthError,
      );
    });

    it('throws when the body is not JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 504,
        json: () => Promise.reject(new Error('bad json')),
      } as unknown as Response);
      await expect(addExternalStreamer('tok', params)).rejects.toThrow(
        'Add failed (HTTP 504)',
      );
    });
  });
});
