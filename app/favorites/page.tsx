import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  listFavoriteStreamers,
  type FavoriteStreamerRow,
} from '@/lib/supabase/favorites';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import { LiveBadge, PlatformBadge } from '@/components/web/Badges';
import { FavoriteButton } from '@/components/web/FavoriteButton';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Favorites | StreamerTimes',
  description: 'Streamers you follow on Streamer Times.',
  robots: { index: false, follow: false },
};

export default async function FavoritesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/app');
  }

  const [favorites, liveSet] = await Promise.all([
    listFavoriteStreamers(supabase),
    getLiveStreamerIdSet().catch(() => new Set<string>()),
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-baseline justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-white">My favorites</h1>
        <span className="text-sm text-text-muted">
          {favorites.length} {favorites.length === 1 ? 'streamer' : 'streamers'}
        </span>
      </header>

      {favorites.length === 0 ? (
        <EmptyState />
      ) : (
        <ul
          className="mt-6 grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Your favorite streamers"
        >
          {favorites.map((streamer) => (
            <li key={streamer.id}>
              <FavoriteCard
                streamer={streamer}
                isLive={liveSet.has(streamer.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function FavoriteCard({
  streamer,
  isLive,
}: {
  streamer: FavoriteStreamerRow;
  isLive: boolean;
}) {
  return (
    <Link
      href={`/streamer/${encodeURIComponent(streamer.id)}`}
      className="group relative flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated p-4 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
    >
      {streamer.avatar_url ? (
        <Image
          src={streamer.avatar_url}
          alt=""
          width={56}
          height={56}
          unoptimized
          className="rounded-full border border-border-default shrink-0"
        />
      ) : (
        <InitialsAvatar name={streamer.name} size={56} className="shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="truncate text-base font-semibold text-text-primary group-hover:text-accent-cyan transition-colors">
            {streamer.name}
          </span>
          {isLive && <LiveBadge />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {streamer.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
          {streamer.is_always_on && (
            <span className="inline-flex items-center rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-accent-cyan">
              24/7
            </span>
          )}
        </div>
      </div>

      <FavoriteButton
        streamerId={streamer.id}
        streamerName={streamer.name}
        size="sm"
        className="shrink-0"
      />
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 gradient-border p-8 text-center">
      <h2 className="text-xl font-bold text-text-primary">No favorites yet</h2>
      <p className="mt-3 max-w-md mx-auto text-text-secondary">
        Tap the heart on any streamer to add them here. Your favorites sync
        with the Streamer Times mobile app.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
        >
          Browse live streams
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          Search streamers
        </Link>
      </div>
    </div>
  );
}
