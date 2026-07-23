import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { safeNextPath, signInGateRedirect } from '@/lib/auth-flag';
import { parseOnboardingStep } from '@/lib/onboarding';
import {
  fetchDiscoverRecommendations,
  fetchHiddenStreamerIds,
  fetchInterestProfile,
} from '@/lib/feed/service';
import { getPartnerApi } from '@/lib/server/partner-api';
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

const SUGGESTION_LIMIT = 24;

/**
 * Default grid of the manual pick step: the most-followed streamers we track
 * (Partner API — the same source as the wizard's /api/search, is_hidden
 * filtered server-side, follower_count DESC NULLS LAST). Deterministic and
 * always populated, unlike the Discover RPC, whose featured-only pool can
 * come up (near-)empty for brand-new accounts.
 */
async function loadMostFollowedSuggestions(): Promise<OnboardingSuggestion[]> {
  const [resp, liveIds] = await Promise.all([
    getPartnerApi().listStreamers({
      order: 'followers',
      limit: SUGGESTION_LIMIT,
      revalidate: 3600,
    }),
    getLiveStreamerIdSet().catch(() => new Set<string>()),
  ]);
  return resp.data.map((s) => ({
    id: s.id,
    name: s.name,
    avatarUrl: s.avatar_url ?? null,
    platforms: s.platforms,
    isLive: liveIds.has(s.id),
  }));
}

/** Fallback when the Partner API is unavailable: Discover recommendations
 * (featured streamers; popularity fallback for users without favorites). */
async function loadDiscoverSuggestions(
  supabase: SupabaseClient,
): Promise<OnboardingSuggestion[]> {
  const profile = await fetchInterestProfile(supabase);
  const recommendations = await fetchDiscoverRecommendations(supabase, profile, SUGGESTION_LIMIT);
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

  // Suggestions for the manual pick step: most-followed first, Discover RPC
  // as fallback. Error-isolated: the wizard works search-only when both fail.
  let suggestions: OnboardingSuggestion[] = [];
  let suggestionsLabel = 'Most followed';
  try {
    suggestions = await loadMostFollowedSuggestions();
  } catch {
    suggestions = [];
  }
  if (suggestions.length === 0) {
    suggestionsLabel = 'Popular right now';
    try {
      suggestions = await loadDiscoverSuggestions(supabase);
    } catch {
      suggestions = [];
    }
  }

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
        suggestionsLabel={suggestionsLabel}
      />
    </main>
  );
}
