import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { signInGateRedirect } from '@/lib/auth-flag';
import { listFavoriteStreamers } from '@/lib/supabase/favorites';
import { fetchStreamSlots, fetchHiddenStreamerIds } from '@/lib/feed/service';
import { ProgramClient } from '@/components/web/program/ProgramClient';
import { FeedNavTabs } from '@/components/web/FeedNavTabs';
import { isUiLang, type UiLang } from '@/lib/i18n-core';
import { chromeLexFor } from '@/lib/i18n-chrome';

// Personalized page — reads the session cookie on every request; never
// ISR-cached, never indexed. Same protected-page convention as /feed and
// /favorites. All time grouping happens client-side in the viewer's local
// timezone (ProgramClient), so the server only gates auth + fetches data.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Program | StreamerTimes',
  description: 'Today’s stream schedule of your favorite streamers.',
  robots: { index: false, follow: false },
};

export default async function ProgramPage({
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
    redirect(signInGateRedirect('/program'));
  }

  let favorites = await listFavoriteStreamers(supabase);
  let slots =
    favorites.length > 0
      ? await fetchStreamSlots(
          supabase,
          favorites.map((f) => f.id),
        ).catch((err) => {
          // The client refetches on its 5-min tick; an empty initial list is
          // better than a hard error page.
          console.error('[program] initial slot fetch failed:', err);
          return [];
        })
      : [];

  // Hidden/test streamers stay off the website (feed convention — the app
  // does not filter these). Polish, not correctness: failures are swallowed.
  try {
    const hidden = await fetchHiddenStreamerIds(
      supabase,
      favorites.map((f) => f.id),
    );
    if (hidden.size > 0) {
      favorites = favorites.filter((f) => !hidden.has(f.id));
      slots = slots.filter((s) => !hidden.has(s.streamerId));
    }
  } catch {
    // Filtering is polish, not correctness.
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <FeedNavTabs locale={locale} active="program" className="mb-6" />
      <header className="flex items-baseline justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-white">{nav.program}</h1>
        <span className="text-sm text-text-muted">
          {favorites.length} {favorites.length === 1 ? 'streamer' : 'streamers'}
        </span>
      </header>

      <ProgramClient initialSlots={slots} favorites={favorites} />
    </main>
  );
}
