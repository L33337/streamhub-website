import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadFeed, loadVolatileFeed } from '../loadFeed';

// ---------------------------------------------------------------------------
// Minimal filter-aware Supabase fake. Each from(table) returns a thenable
// query builder that applies the recorded eq/neq/gt/gte/in/not predicates
// (dotted keys like "streamers.approved" traverse the nested join object) to a
// canned per-table dataset; rpc(name) returns a canned result. Unlisted tables
// resolve to [] so loadFeed's non-volatile sections just come back empty (their
// per-section try/catch handles the rest). order/limit/select are no-ops.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function getPath(row: Row, path: string): unknown {
  if (!path.includes('.')) return row[path];
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Row)[key];
    return undefined;
  }, row);
}

function makeSupabaseFake(
  tables: Record<string, Row[]>,
  rpcs: Record<string, unknown>,
): SupabaseClient {
  const buildQuery = (rows: Row[]) => {
    const preds: Array<(r: Row) => boolean> = [];
    const resolved = () => ({ data: rows.filter((r) => preds.every((p) => p(r))), error: null });
    const b = {
      select: () => b,
      eq: (col: string, val: unknown) => (preds.push((r) => getPath(r, col) === val), b),
      neq: (col: string, val: unknown) => (preds.push((r) => getPath(r, col) !== val), b),
      gt: (col: string, val: unknown) => (preds.push((r) => (getPath(r, col) as never) > (val as never)), b),
      gte: (col: string, val: unknown) => (preds.push((r) => (getPath(r, col) as never) >= (val as never)), b),
      lt: (col: string, val: unknown) => (preds.push((r) => (getPath(r, col) as never) < (val as never)), b),
      lte: (col: string, val: unknown) => (preds.push((r) => (getPath(r, col) as never) <= (val as never)), b),
      in: (col: string, vals: unknown[]) => (preds.push((r) => vals.includes(getPath(r, col))), b),
      // Supabase's .not(col, op, val) — the fake only models `.not(col, 'is', null)`
      // (extra positional args are ignored at runtime).
      not: (col: string) => (preds.push((r) => getPath(r, col) != null), b),
      order: () => b,
      limit: () => b,
      maybeSingle: () => Promise.resolve({ data: resolved().data[0] ?? null, error: null }),
      then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve(resolved()),
    };
    return b;
  };

  return {
    from: (table: string) => buildQuery(tables[table] ?? []),
    rpc: (name: string) => Promise.resolve({ data: rpcs[name] ?? [], error: null }),
  } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Fixtures: favA (live), favB (upcoming), favH (live but is_hidden → dropped),
// featX (featured non-favorite, live → suggestion in the rail).
// ---------------------------------------------------------------------------

const NOW = new Date('2026-07-11T12:00:00.000Z');
const SINCE = new Date('2026-07-11T00:00:00.000Z');

const slot = (over: Partial<Row>): Row => ({
  id: `slot-${over.streamer_id}`,
  streamer_id: 'x',
  streamer_name: 'X',
  platforms: ['twitch'],
  stream_title: 'title',
  category: 'Just Chatting',
  thumbnail_url: null,
  avatar_url: `av-${over.streamer_id}`,
  start_time: NOW.toISOString(),
  duration: 240,
  status: 'live',
  confidence: 'high',
  reasoning: null,
  is_ai_prediction: false,
  visible: true,
  ai_prediction_id: null,
  slot_kind: 'regular',
  is_always_on: false,
  ...over,
});

const streamer = (id: string, over: Partial<Row> = {}): Row => ({
  id,
  name: id.toUpperCase(),
  platforms: ['twitch'],
  avatar_url: `av-${id}`,
  is_featured: false,
  is_always_on: false,
  approved: true,
  is_hidden: false,
  ...over,
});

const favoriteRow = (id: string, createdAt: string): Row => ({
  streamer_id: id,
  created_at: createdAt,
  streamers: streamer(id),
});

const recentRow = (id: string): Row => ({
  id: `recent-${id}`,
  streamer_id: id,
  streamer_name: id.toUpperCase(),
  avatar_url: `av-${id}`,
  platform: 'twitch',
  title: 'recent',
  category: 'Just Chatting',
  started_at: '2026-07-11T06:00:00.000Z',
  ended_at: '2026-07-11T09:00:00.000Z',
  duration_minutes: 180,
  peak_viewer_count: 10,
  vod_url: null,
  thumbnail_url: null,
});

function makeFixture(): SupabaseClient {
  return makeSupabaseFake(
    {
      user_favorites: [
        favoriteRow('favA', '2026-07-11T10:00:00Z'),
        favoriteRow('favB', '2026-07-11T09:00:00Z'),
        favoriteRow('favH', '2026-07-11T08:00:00Z'),
      ],
      streamers: [
        streamer('favA'),
        streamer('favB'),
        streamer('favH', { is_hidden: true }),
        streamer('featX', { is_featured: true }),
      ],
      stream_slots: [
        slot({ streamer_id: 'favA', status: 'live', start_time: '2026-07-11T11:30:00Z' }),
        slot({ streamer_id: 'favB', status: 'upcoming', start_time: '2026-07-11T13:00:00Z' }),
        slot({ streamer_id: 'favH', status: 'live', start_time: '2026-07-11T11:00:00Z' }),
        slot({ streamer_id: 'featX', status: 'live', start_time: '2026-07-11T11:45:00Z' }),
      ],
    },
    {
      fetch_feed_recent_streams: [recentRow('favA'), recentRow('favH')],
      compute_user_interest_profile: {},
      recommend_featured_streamers: [],
      fetch_trending_categories: [],
    },
  );
}

describe('loadVolatileFeed', () => {
  it('matches loadFeed on the volatile sections + maps (no drift)', async () => {
    const full = await loadFeed(makeFixture(), { since: SINCE, now: NOW });
    const volatile = await loadVolatileFeed(makeFixture(), { since: SINCE, now: NOW });

    expect(volatile.liveNow).toEqual(full.liveNow);
    expect(volatile.upNext).toEqual(full.upNext);
    expect(volatile.recent).toEqual(full.recent);
    expect(volatile.avatarMap).toEqual(full.avatarMap);
    expect(volatile.nameMap).toEqual(full.nameMap);
  });

  it('drops hidden favorites and appends live featured suggestions', async () => {
    const v = await loadVolatileFeed(makeFixture(), { since: SINCE, now: NOW });

    const liveIds = v.liveNow.map((e) => e.slot.streamerId);
    expect(liveIds).toContain('favA'); // favorite, live
    expect(liveIds).toContain('featX'); // featured non-favorite, live → suggestion
    expect(liveIds).not.toContain('favH'); // is_hidden → filtered everywhere

    expect(v.liveNow.find((e) => e.slot.streamerId === 'favA')?.isFeaturedSuggestion).toBe(false);
    expect(v.liveNow.find((e) => e.slot.streamerId === 'featX')?.isFeaturedSuggestion).toBe(true);

    // favB is the only upcoming favorite inside the Up Next window.
    expect(v.upNext.map((s) => s.streamerId)).toEqual(['favB']);

    // Recent excludes the hidden favorite.
    expect(v.recent.map((r) => r.streamerId)).toEqual(['favA']);

    // Maps cover the favorites (+ featured avatar), never the hidden-only ids.
    expect(v.nameMap).toMatchObject({ favA: 'FAVA', favB: 'FAVB', favH: 'FAVH' });
    expect(v.avatarMap.featX).toBe('av-featX');
  });
});
