import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { signInGateRedirect } from '@/lib/auth-flag';
import { loadFeed } from '@/lib/feed/loadFeed';
import { getFeedAnalyticsEnabled } from '@/lib/feed/preferences';
import { resolveSince } from '@/lib/feed/logic';
import { SEEN_COOKIE } from '@/lib/feed/constants';
import { getPartnerApi } from '@/lib/server/partner-api';
import { gameSlug } from '@/lib/game-slug';
import { FeedClient } from '@/components/web/feed/FeedClient';

/**
 * Category name → hub slug for every game with a /game/<slug> page, so
 * trending-game tiles can link internally (2026-07-22, app parity). The
 * catalog fetch is ISR-cached (revalidate 600, same as the games hub), so
 * this adds no meaningful per-request cost to the force-dynamic feed page.
 * Failure degrades to {} — the client falls back to chip filter / Twitch.
 */
async function loadGameHubSlugs(): Promise<Record<string, string>> {
  try {
    const { data: games } = await getPartnerApi().listGames({ limit: 500, revalidate: 600 });
    const map: Record<string, string> = {};
    for (const game of games) {
      const slug = gameSlug(game.category);
      if (slug) map[game.category] = slug;
    }
    return map;
  } catch {
    return {};
  }
}

// Personalized page — reads the session cookie on every request; never
// ISR-cached, never indexed. Same protected-page convention as /favorites.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Feed | StreamerTimes',
  description: 'Your personalized live stream feed on Streamer Times.',
  robots: { index: false, follow: false },
};

export default async function FeedPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(signInGateRedirect('/feed'));
  }

  const cookieStore = await cookies();
  const since = resolveSince(cookieStore.get(SEEN_COOKIE)?.value, new Date());

  const [feedData, analyticsEnabled, gameHubSlugs] = await Promise.all([
    loadFeed(supabase, { since }),
    getFeedAnalyticsEnabled(supabase, user.id),
    loadGameHubSlugs(),
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <FeedClient
        initial={feedData}
        sinceIso={since.toISOString()}
        userId={user.id}
        analyticsEnabled={analyticsEnabled}
        gameHubSlugs={gameHubSlugs}
      />
    </main>
  );
}
