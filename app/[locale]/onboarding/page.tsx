import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { safeNextPath, signInGateRedirect } from '@/lib/auth-flag';
import { parseOnboardingStep } from '@/lib/onboarding';
import {
  fetchDiscoverRecommendations,
  fetchHiddenStreamerIds,
  fetchInterestProfile,
} from '@/lib/feed/service';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import { OnboardingClient } from '@/components/web/onboarding/OnboardingClient';
import type { OnboardingSuggestion } from '@/components/web/onboarding/types';

// New-user onboarding wizard (post-signup): import Twitch follows or pick
// favorites manually. Reached via the fresh-signup redirects in
// app/auth/callback/route.ts and lib/auth-email.ts (see lib/onboarding.ts);
// returning users only ever land here by URL. Same gated-page conventions as
// /feed: force-dynamic, noindex, robots.txt disallow (app/robots.ts).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Welcome | StreamerTimes',
  description: 'Set up your Streamer Times feed: import your Twitch follows or pick favorite streamers.',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ step?: string; next?: string; connect_error?: string }>;
}

export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(signInGateRedirect('/onboarding'));
  }

  const { step, next: rawNext, connect_error: connectError } = await searchParams;
  const next = safeNextPath(rawNext);

  // Suggestions for the manual pick step — the Discover recommendation RPC
  // falls back to "popular right now" for brand-new users without favorites.
  // Error-isolated: the wizard works search-only when any of this fails.
  const suggestions: OnboardingSuggestion[] = await (async () => {
    try {
      const profile = await fetchInterestProfile(supabase);
      const recommendations = await fetchDiscoverRecommendations(supabase, profile, 24);
      const [hidden, liveIds] = await Promise.all([
        fetchHiddenStreamerIds(supabase, recommendations.map((r) => r.streamerId)).catch(
          () => new Set<string>(),
        ),
        getLiveStreamerIdSet().catch(() => new Set<string>()),
      ]);
      return recommendations
        .filter((r) => !hidden.has(r.streamerId))
        .map((r) => ({
          id: r.streamerId,
          name: r.name,
          avatarUrl: r.avatarUrl ?? null,
          platforms: r.platforms,
          isLive: liveIds.has(r.streamerId),
        }));
    } catch {
      return [];
    }
  })();

  const hasTwitchIdentity = (user.identities ?? []).some(
    (identity) => identity.provider === 'twitch',
  );

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <OnboardingClient
        initialStep={parseOnboardingStep(step)}
        nextPath={next}
        connectError={connectError ?? null}
        hasTwitchIdentity={hasTwitchIdentity}
        suggestions={suggestions}
      />
    </main>
  );
}
