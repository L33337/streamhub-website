import 'server-only';

// "Trending on Twitch" rail data for the /games hub (games-page expansion).
//
// Reads the public `trending_games` table (Twitch Helix "Get Top Games"
// cache, refreshed every ~6h by the backend) straight from PostgREST with a
// plain fetch. Deliberately NOT via lib/supabase/server.ts: that client
// calls cookies(), which would opt the ISR games pages into dynamic
// rendering (ISR-K1 rule). A plain fetch keeps the page static and joins the
// normal Next.js data cache.

export interface TrendingGame {
  rank: number;
  game_id: string;
  game_name: string;
  box_art_url: string | null;
}

const REVALIDATE_SECONDS = 1800; // table refreshes ~6h; 30 min is plenty fresh

/**
 * Top games on Twitch overall (not just our catalog). Returns [] on ANY
 * failure — the rail simply doesn't render (never-throw ISR convention).
 */
export async function fetchTrendingRail(limit = 20): Promise<TrendingGame[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) return [];

  try {
    const url =
      `${baseUrl}/rest/v1/trending_games` +
      `?select=rank,game_id,game_name,box_art_url&order=rank.asc&limit=${limit}`;
    const res = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows)) return [];
    return rows.filter(
      (r): r is TrendingGame =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as TrendingGame).rank === 'number' &&
        typeof (r as TrendingGame).game_name === 'string'
    );
  } catch {
    return [];
  }
}
