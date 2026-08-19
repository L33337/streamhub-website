import type { Platform, PublicStreamHistory } from '@/lib/server/partner-api';

/** A platform's VOD for a session, guaranteed to have a URL. */
export interface VodLink {
  platform: Platform;
  url: string;
}

/**
 * Platforms a history item was broadcast on.
 *
 * `platforms` is the simulcast-aware field: a stream that went out on Twitch
 * and YouTube at once is ONE item listing both. It is optional in our type
 * mirror to survive deploy skew (new site against an API that predates the
 * field), hence the fallback to the legacy scalar.
 */
export function historyPlatforms(stream: PublicStreamHistory): Platform[] {
  const list = stream.platforms;
  if (list && list.length > 0) return list;
  return [stream.platform];
}

/**
 * Thumbnail URL safe to render, or null.
 *
 * Twitch returns a "/_404/404_processing" placeholder while a freshly-ended
 * VOD's thumbnail is still being generated. The collector already stores it as
 * null, but guard here too so a stale placeholder URL can never render as the
 * grey 404 image.
 */
export function usableThumbnail(url: string | null): string | null {
  if (!url || url.includes('/_404/404_processing')) return null;
  return url;
}

/**
 * Watchable VOD links, one per platform, in `platforms` order.
 *
 * A simulcast can carry a link for only one side: Twitch VODs expire after
 * 14/60 days while YouTube's persist, so entries without a URL are dropped
 * rather than rendered as dead links. Falls back to the legacy scalar pair when
 * the API predates `vods`.
 */
export function historyVodLinks(stream: PublicStreamHistory): VodLink[] {
  const source =
    stream.vods && stream.vods.length > 0
      ? stream.vods
      : [{ platform: stream.platform, vod_url: stream.vod_url }];

  return source.flatMap((v) => (v.vod_url ? [{ platform: v.platform, url: v.vod_url }] : []));
}
