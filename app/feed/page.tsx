import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { signInGateRedirect } from '@/lib/auth-flag';
import { loadFeed } from '@/lib/feed/loadFeed';
import { getFeedAnalyticsEnabled } from '@/lib/feed/preferences';
import { resolveSince } from '@/lib/feed/logic';
import { SEEN_COOKIE } from '@/lib/feed/constants';
import { FeedClient } from '@/components/web/feed/FeedClient';

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

  const [feedData, analyticsEnabled] = await Promise.all([
    loadFeed(supabase, { since }),
    getFeedAnalyticsEnabled(supabase, user.id),
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <FeedClient
        initial={feedData}
        sinceIso={since.toISOString()}
        userId={user.id}
        analyticsEnabled={analyticsEnabled}
      />
    </main>
  );
}
