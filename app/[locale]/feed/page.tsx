import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { signInGateRedirect } from '@/lib/auth-flag';
import { loadFeed } from '@/lib/feed/loadFeed';
import { loadFeedExtras } from '@/lib/server/feed-extras';
import { getFeedAnalyticsEnabled } from '@/lib/feed/preferences';
import { resolveSince } from '@/lib/feed/logic';
import { SEEN_COOKIE } from '@/lib/feed/constants';
import { FEED_ANCHORS, FEED_SECTION_ANCHOR_CLASS } from '@/lib/feed/anchors';
import { hasFeedQuickFacts } from '@/lib/feed/quick-facts';
import { hourLabels as buildHourLabels, weekdayLabels as buildWeekdayLabels } from '@/lib/home/quick-facts';
import { getPartnerApi } from '@/lib/server/partner-api';
import { gameSlug } from '@/lib/game-slug';
import { FeedClient } from '@/components/web/feed/FeedClient';
import { FeedNavTabs } from '@/components/web/FeedNavTabs';
import { HomeStreamerWiki } from '@/components/web/home/HomeStreamerWiki';
import type { HomeSectionNavItem } from '@/components/web/home/HomeSectionNav';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { chromeLexFor } from '@/lib/i18n-chrome';

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
  title: 'My Feed | Streamer Times',
  description: 'Your personalized live stream feed on Streamer Times.',
  robots: { index: false, follow: false },
};

export default async function FeedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const nav = chromeLexFor(locale).feedNav;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(signInGateRedirect('/feed'));
  }

  const cookieStore = await cookies();
  const since = resolveSince(cookieStore.get(SEEN_COOKIE)?.value, new Date());

  const [feedData, analyticsEnabled, gameHubSlugs, extras] = await Promise.all([
    loadFeed(supabase, { since }),
    getFeedAnalyticsEnabled(supabase, user.id),
    loadGameHubSlugs(),
    // Rankings + Streamer Wiki. Never throws; both halves degrade to null.
    loadFeedExtras(supabase, (href) => localeHref(locale, href)),
  ]);

  // Section-nav chips MIRROR each section's own hide rule — a chip must never
  // point at a section that is not on the page (HomeSectionNav prunes
  // drift-orphans at mount as a second line of defence). The wiki's anchor
  // lives outside FeedClient, which is fine: the nav resolves ids against the
  // whole document.
  const statsVisible =
    feedData.weekLeaderboard.length > 0 || hasFeedQuickFacts(feedData.quickFacts);
  const sectionNav: HomeSectionNavItem[] = [
    ...(feedData.liveNow.length > 0 ? [{ id: FEED_ANCHORS.live, label: 'Live' }] : []),
    ...(feedData.upNext.length > 0 ? [{ id: FEED_ANCHORS.upNext, label: 'Up next' }] : []),
    ...(feedData.recent.length > 0 ? [{ id: FEED_ANCHORS.recent, label: 'New for you' }] : []),
    ...(feedData.clips.length > 0 ? [{ id: FEED_ANCHORS.clips, label: 'Highlights' }] : []),
    ...(extras.rankings ? [{ id: FEED_ANCHORS.rankings, label: 'Rankings' }] : []),
    ...(statsVisible ? [{ id: FEED_ANCHORS.stats, label: 'Your stats' }] : []),
    ...(extras.wiki ? [{ id: FEED_ANCHORS.wiki, label: 'Streamer wiki' }] : []),
  ];

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <FeedNavTabs locale={locale} active="feed" className="mb-6" />
      <FeedClient
        title={nav.feed}
        initial={feedData}
        sinceIso={since.toISOString()}
        userId={user.id}
        analyticsEnabled={analyticsEnabled}
        gameHubSlugs={gameHubSlugs}
        rankings={extras.rankings}
        sectionNav={sectionNav}
        // Built here, never in the browser: the timezone-dependent quick facts
        // must not format their own labels client-side, or the browser's Intl
        // output could disagree with the server's (lib/home/quick-facts.ts).
        hourLabels={buildHourLabels(locale)}
        dayLabels={buildWeekdayLabels(locale)}
      />

      {/* Streamer Wiki — the discovery surface that replaced Discover
          (2026-08-03). A SERVER sibling of FeedClient rather than a child:
          it takes Map/Set props and resolves its own copy through the hub
          lexicon, and neither survives a client boundary. Being outside the
          client tree also means it logs no section impression — accepted,
          documented in AGENTS.md. */}
      {extras.wiki && (
        <div id={FEED_ANCHORS.wiki} className={FEED_SECTION_ANCHOR_CLASS}>
          <HomeStreamerWiki
            streamers={extras.wiki.streamers}
            statsById={extras.wiki.statsById}
            nextSlots={extras.wiki.nextSlots}
            liveIds={extras.wiki.liveIds}
            locale={locale}
          />
        </div>
      )}
    </main>
  );
}
