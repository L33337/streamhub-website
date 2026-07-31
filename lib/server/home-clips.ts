import 'server-only';

// "Clips of the week" for the anonymous homepage (rebuild 2026-07-27, filters
// 2026-07-31): the global top of stream_clips by views, 7-day window — the
// signed-out sibling of the feed's fetchTopClipsExcluding. Anon RLS on
// stream_clips already restricts to is_visible = true; hidden/unapproved
// streamers are excluded via the embedded join, which also supplies the
// display names ClipCard needs and the broadcaster language the rail's
// language filter is built from.

import type { FeedClip } from '@/lib/feed/types';
import type { StreamClipRow } from '@/lib/feed/types';
import { transformFeedClip } from '@/lib/feed/transforms';
import { orderClipsByPopularity } from '@/lib/feed/logic';
import { floorToHourIso } from '@/lib/home/logic';
import { HOME_CLIPS_POOL_MAX } from '@/lib/home/clip-filters';
import { anonRestGet } from './anon-rest';

// `creator_name` is deliberately absent: nothing on the website renders it,
// and every column here is paid for 300 times over in the client payload
// (ClipCard is a client component, so the whole pool crosses the boundary).
const CLIP_COLUMNS =
  'id,streamer_id,external_clip_id,title,url,thumbnail_url,' +
  'duration_seconds,view_count,category,clip_created_at';

type HomeClipRow = Pick<
  StreamClipRow,
  | 'id'
  | 'streamer_id'
  | 'external_clip_id'
  | 'title'
  | 'url'
  | 'thumbnail_url'
  | 'duration_seconds'
  | 'view_count'
  | 'category'
  | 'clip_created_at'
> & { streamers: { name: string; language: string | null } | null };

export interface HomeClips {
  clips: FeedClip[];
  /** streamer_id → display name for ClipCard/lightbox captions. */
  names: Record<string, string>;
  /**
   * streamer_id → raw broadcaster language ("de", "pt-BR", "other"). Only
   * streamers that HAVE one appear; the filter normalizes and labels it.
   * Twitch reports no language per clip, so this is the only source.
   */
  languages: Record<string, string>;
}

export async function fetchTopClipsOfWeek(
  limit = HOME_CLIPS_POOL_MAX,
): Promise<HomeClips> {
  // Hour-bucketed window start → stable data-cache key across 60 s re-renders.
  const since = floorToHourIso(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const query =
    `stream_clips?select=${CLIP_COLUMNS},streamers!inner(name,language,is_hidden,approved)` +
    `&clip_created_at=gte.${encodeURIComponent(since)}` +
    '&streamers.is_hidden=eq.false&streamers.approved=eq.true' +
    `&order=view_count.desc&limit=${limit}`;

  const rows = await anonRestGet<HomeClipRow>(query, 1800);
  if (!rows) return { clips: [], names: {}, languages: {} };

  const names: Record<string, string> = {};
  const languages: Record<string, string> = {};
  const clips = rows.map((row) => {
    if (row.streamers?.name) names[row.streamer_id] = row.streamers.name;
    if (row.streamers?.language) languages[row.streamer_id] = row.streamers.language;
    return transformFeedClip(row as unknown as StreamClipRow);
  });

  // WHICH clips are in the pool is decided by views (an honest "top of the
  // week"); the ORDER they are shown in is round-robin — streamers by their
  // best clip, then one each in turn. Straight view order gave the rail's head
  // to two or three big channels (22 of the top 300 belonged to a single
  // streamer), which reads as a fan page rather than as the week. Same
  // function the app and the signed-in feed rank their Highlights with; an
  // anonymous visitor has no engagement stats, hence null.
  return { clips: orderClipsByPopularity(clips, null), names, languages };
}
