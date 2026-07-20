import { describe, expect, it } from 'vitest';
import { historyPlatforms, historyVodLinks } from '@/lib/history';
import type { PublicStreamHistory } from '@/lib/server/partner-api';

function item(overrides: Partial<PublicStreamHistory> = {}): PublicStreamHistory {
  return {
    id: 'twitch_1',
    streamer_id: 'examplestreamer',
    platform: 'twitch',
    platforms: ['twitch'],
    title: 'Ranked grind',
    category: 'VALORANT',
    thumbnail_url: null,
    started_at: '2026-07-19T16:44:28Z',
    ended_at: '2026-07-20T04:48:28Z',
    duration_minutes: 720,
    vod_url: 'https://twitch.tv/videos/1',
    vods: [{ platform: 'twitch', vod_url: 'https://twitch.tv/videos/1' }],
    ...overrides,
  };
}

describe('historyPlatforms', () => {
  it('returns the simulcast platform list', () => {
    expect(historyPlatforms(item({ platforms: ['twitch', 'youtube'] }))).toEqual([
      'twitch',
      'youtube',
    ]);
  });

  it('falls back to the scalar when the API predates `platforms` (deploy skew)', () => {
    expect(historyPlatforms(item({ platform: 'youtube', platforms: undefined }))).toEqual([
      'youtube',
    ]);
  });

  it('falls back when `platforms` arrives empty', () => {
    expect(historyPlatforms(item({ platforms: [] }))).toEqual(['twitch']);
  });
});

describe('historyVodLinks', () => {
  it('returns one link per platform of a simulcast', () => {
    const links = historyVodLinks(
      item({
        platforms: ['twitch', 'youtube'],
        vods: [
          { platform: 'twitch', vod_url: 'https://twitch.tv/videos/1' },
          { platform: 'youtube', vod_url: 'https://youtube.com/watch?v=abc' },
        ],
      }),
    );
    expect(links).toEqual([
      { platform: 'twitch', url: 'https://twitch.tv/videos/1' },
      { platform: 'youtube', url: 'https://youtube.com/watch?v=abc' },
    ]);
  });

  it('drops platforms without a VOD instead of rendering a dead link', () => {
    // Twitch VODs expire after 14/60 days; YouTube's persist.
    const links = historyVodLinks(
      item({
        platforms: ['twitch', 'youtube'],
        vod_url: null,
        vods: [
          { platform: 'twitch', vod_url: null },
          { platform: 'youtube', vod_url: 'https://youtube.com/watch?v=abc' },
        ],
      }),
    );
    expect(links).toEqual([{ platform: 'youtube', url: 'https://youtube.com/watch?v=abc' }]);
  });

  it('returns nothing when no platform has a VOD', () => {
    expect(
      historyVodLinks(
        item({ vod_url: null, vods: [{ platform: 'twitch', vod_url: null }] }),
      ),
    ).toEqual([]);
  });

  it('falls back to the scalar pair when the API predates `vods` (deploy skew)', () => {
    const links = historyVodLinks(
      item({ platform: 'youtube', vod_url: 'https://youtube.com/watch?v=xyz', vods: undefined }),
    );
    expect(links).toEqual([{ platform: 'youtube', url: 'https://youtube.com/watch?v=xyz' }]);
  });

  it('falls back to nothing when the legacy scalar has no VOD either', () => {
    expect(historyVodLinks(item({ vod_url: null, vods: undefined }))).toEqual([]);
  });
});
