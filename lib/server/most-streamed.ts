import 'server-only';

// "Most streamed this week" (homepage, 2026-07-27): featured streamers ranked
// by hours live over the last 7 days. stream_history is per-platform (a
// simulcast = two rows) and Twitch splits nights into several VODs, so the
// rows are merged into SESSIONS client-side (rankWeekStreamed — the pure-TS
// sibling of the SQL gaps-and-islands dedupe; see StreamHub CLAUDE.md
// "Session counting"). source='vod' only — 'stream_slot' rows are synthetic
// always-on fragments that would let 24/7 channels drown everyone else.

import {
  floorToHourIso,
  rankWeekStreamed,
  type HistoryIntervalRow,
  type WeekStreamedEntry,
} from '@/lib/home/logic';
import { anonRestGet, anonRestGetPaged } from './anon-rest';

const REVALIDATE_SECONDS = 1800;
const WINDOW_DAYS = 7;

export interface MostStreamedEntry extends WeekStreamedEntry {
  name: string;
  avatarUrl: string | null;
}

type HistoryRow = HistoryIntervalRow & { streamers: { is_featured: boolean } | null };

export async function fetchWeekMostStreamed(top = 3): Promise<MostStreamedEntry[]> {
  const now = new Date();
  const since = floorToHourIso(
    new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000),
  );

  // ~2k featured vod rows per week today → 2-3 pages. Deterministic order is
  // required for the offset pagination (see anonRestGetPaged).
  const rows = await anonRestGetPaged<HistoryRow>(
    'stream_history?select=streamer_id,started_at,ended_at,streamers!inner(is_featured)' +
      '&source=eq.vod' +
      `&started_at=gte.${encodeURIComponent(since)}` +
      '&streamers.is_featured=eq.true&streamers.is_hidden=eq.false&streamers.approved=eq.true' +
      '&order=started_at.asc,id.asc',
    REVALIDATE_SECONDS,
  );
  const ranked = rankWeekStreamed(rows, new Date(since), now, top);
  if (ranked.length === 0) return [];

  // Resolve display names/avatars for the top rows only.
  const quotedIds = ranked
    .map((entry) => `"${entry.streamerId.replace(/"/g, '')}"`)
    .join(',');
  const streamers = await anonRestGet<{
    id: string;
    name: string;
    avatar_url: string | null;
  }>(
    `streamers?select=id,name,avatar_url&id=in.(${encodeURIComponent(quotedIds)})`,
    REVALIDATE_SECONDS,
  );
  const byId = new Map((streamers ?? []).map((row) => [row.id, row]));

  return ranked.flatMap((entry) => {
    const streamer = byId.get(entry.streamerId);
    if (!streamer) return [];
    return [{ ...entry, name: streamer.name, avatarUrl: streamer.avatar_url }];
  });
}
