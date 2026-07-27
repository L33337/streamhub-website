import 'server-only';

// "Clips of the week" for the anonymous homepage (rebuild 2026-07-27): the
// global top of stream_clips by views, 7-day window — the signed-out sibling
// of the feed's fetchTopClipsExcluding. Anon RLS on stream_clips already
// restricts to is_visible = true; hidden/unapproved streamers are excluded via
// the embedded join, which also supplies the display names ClipCard needs.

import type { FeedClip } from '@/lib/feed/types';
import type { StreamClipRow } from '@/lib/feed/types';
import { transformFeedClip } from '@/lib/feed/transforms';
import { floorToHourIso } from '@/lib/home/logic';
import { anonRestGet } from './anon-rest';

const CLIP_COLUMNS =
  'id,streamer_id,external_clip_id,title,url,thumbnail_url,' +
  'duration_seconds,view_count,category,clip_created_at,creator_name';

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
  | 'creator_name'
> & { streamers: { name: string } | null };

export interface HomeClips {
  clips: FeedClip[];
  /** streamer_id → display name for ClipCard/lightbox captions. */
  names: Record<string, string>;
}

export async function fetchTopClipsOfWeek(limit = 12): Promise<HomeClips> {
  // Hour-bucketed window start → stable data-cache key across 60 s re-renders.
  const since = floorToHourIso(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const query =
    `stream_clips?select=${CLIP_COLUMNS},streamers!inner(name,is_hidden,approved)` +
    `&clip_created_at=gte.${encodeURIComponent(since)}` +
    '&streamers.is_hidden=eq.false&streamers.approved=eq.true' +
    `&order=view_count.desc&limit=${limit}`;

  const rows = await anonRestGet<HomeClipRow>(query, 1800);
  if (!rows) return { clips: [], names: {} };

  const names: Record<string, string> = {};
  const clips = rows.map((row) => {
    if (row.streamers?.name) names[row.streamer_id] = row.streamers.name;
    return transformFeedClip(row as unknown as StreamClipRow);
  });
  return { clips, names };
}
