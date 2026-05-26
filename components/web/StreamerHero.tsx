import Image from 'next/image';
import type { PublicStreamer, PublicStreamSlot } from '@/lib/server/partner-api';
import { AlwaysOnBadge, LiveBadge, PlatformBadge } from './Badges';
import { FavoriteButton } from './FavoriteButton';
import { InitialsAvatar } from './InitialsAvatar';
import { InstallAppCta } from './InstallAppCta';

interface Props {
  streamer: PublicStreamer;
  liveSlot: PublicStreamSlot | null;
}

export function StreamerHero({ streamer, liveSlot }: Props) {
  const isLive = liveSlot !== null;
  const isAlwaysOn = liveSlot?.is_always_on === true;

  return (
    <header className="relative gradient-border p-6 md:p-8">
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
        {streamer.avatar_url ? (
          <Image
            src={streamer.avatar_url}
            alt={`${streamer.name} avatar`}
            width={160}
            height={160}
            className="rounded-full border-2 border-accent-cyan/40 glow-cyan"
            unoptimized
          />
        ) : (
          <InitialsAvatar name={streamer.name} size={160} />
        )}

        <div className="flex-1 text-center md:text-left">
          <div className="flex items-start justify-center gap-3 md:justify-start">
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">
              {streamer.name}
            </h1>
            <FavoriteButton
              streamerId={streamer.id}
              streamerName={streamer.name}
              size="md"
              className="mt-1 shrink-0"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            {streamer.platforms.map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
            {isLive && <LiveBadge />}
            {isAlwaysOn && <AlwaysOnBadge />}
            {streamer.is_featured && (
              <span className="inline-flex items-center rounded-full border border-accent-pink/40 bg-accent-pink/10 px-2 py-0.5 text-xs font-medium text-accent-pink">
                Featured
              </span>
            )}
          </div>

          {isLive && liveSlot && (
            <p className="mt-4 text-text-secondary">
              <span className="text-text-primary font-semibold">Now streaming:</span>{' '}
              {liveSlot.title}
              {liveSlot.category ? (
                <span className="text-text-muted"> · {liveSlot.category}</span>
              ) : null}
            </p>
          )}

          <InstallAppCta />
        </div>
      </div>
    </header>
  );
}
