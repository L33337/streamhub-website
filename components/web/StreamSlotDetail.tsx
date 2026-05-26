import Image from 'next/image';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  AlwaysOnBadge,
  ConfidenceBadge,
  LiveBadge,
  PlatformBadge,
  PredictedBadge,
} from './Badges';
import { InitialsAvatar } from './InitialsAvatar';
import { LocalTime } from './LocalTime';

function formatDuration(minutes: number): string | null {
  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}min`;
}

export function StreamSlotDetail({ slot }: { slot: PublicStreamSlot }) {
  if (slot.is_predicted) {
    return <PredictionVariant slot={slot} />;
  }
  return <LiveVariant slot={slot} />;
}

function LiveVariant({ slot }: { slot: PublicStreamSlot }) {
  const durationLabel = slot.is_always_on ? null : formatDuration(slot.duration_minutes);
  return (
    <article className="p-6 md:p-8">
      <HeroThumbnail slot={slot} />

      <StreamerRow slot={slot} className="mt-5" />

      <h1
        id="slot-detail-title"
        className="mt-4 text-2xl md:text-3xl font-bold gradient-text leading-tight"
        title={slot.title}
      >
        {slot.title}
      </h1>

      <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
        {slot.category && (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Category</dt>
            <dd>
              <span className="text-text-muted">Category:</span> {slot.category}
            </dd>
          </div>
        )}
        {slot.is_always_on ? (
          <div>
            <dt className="sr-only">Schedule</dt>
            <dd>
              <span className="text-text-muted">Streaming:</span>{' '}
              <span className="text-accent-cyan font-semibold">24/7</span>
            </dd>
          </div>
        ) : (
          <>
            <div>
              <dt className="sr-only">Start time</dt>
              <dd>
                <span className="text-text-muted">Started:</span>{' '}
                <LocalTime utcIso={slot.start_time} />
              </dd>
            </div>
            {durationLabel && (
              <div>
                <dt className="sr-only">Duration</dt>
                <dd>
                  <span className="text-text-muted">Duration:</span> {durationLabel}
                </dd>
              </div>
            )}
          </>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {slot.platforms.map((p) => (
          <PlatformBadge key={p} platform={p} />
        ))}
        {slot.is_always_on && <AlwaysOnBadge />}
      </div>

      <WatchButtons slot={slot} />
    </article>
  );
}

function PredictionVariant({ slot }: { slot: PublicStreamSlot }) {
  const durationLabel = formatDuration(slot.duration_minutes);
  return (
    <article className="p-6 md:p-8">
      <div className="flex flex-col items-center">
        {slot.avatar_url ? (
          <Image
            src={slot.avatar_url}
            alt={`${slot.streamer_name} avatar`}
            width={96}
            height={96}
            unoptimized
            className="rounded-full border-2 border-accent-cyan/40 glow-cyan"
          />
        ) : (
          <InitialsAvatar name={slot.streamer_name} size={96} />
        )}
        <h2 className="mt-4 text-2xl font-bold text-text-primary">{slot.streamer_name}</h2>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <PredictedBadge />
          <ConfidenceBadge level={slot.confidence} />
          {slot.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
        </div>
      </div>

      <h1
        id="slot-detail-title"
        className="mt-6 text-xl md:text-2xl font-bold text-text-primary leading-tight text-center"
        title={slot.title}
      >
        {slot.title}
      </h1>

      <dl className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-text-secondary">
        {slot.category && (
          <div>
            <dt className="sr-only">Category</dt>
            <dd>
              <span className="text-text-muted">Category:</span> {slot.category}
            </dd>
          </div>
        )}
        <div>
          <dt className="sr-only">Predicted start</dt>
          <dd>
            <span className="text-text-muted">Predicted:</span>{' '}
            <LocalTime utcIso={slot.start_time} />
          </dd>
        </div>
        {durationLabel && (
          <div>
            <dt className="sr-only">Predicted duration</dt>
            <dd>
              <span className="text-text-muted">Duration:</span> ~{durationLabel}
            </dd>
          </div>
        )}
      </dl>

      <ReasoningBox reasoning={slot.reasoning} />

      <WatchButtons slot={slot} />
    </article>
  );
}

function HeroThumbnail({ slot }: { slot: PublicStreamSlot }) {
  const showLive = slot.status === 'live' && !slot.is_always_on;
  const showAlwaysOn = slot.is_always_on;

  if (slot.thumbnail_url) {
    return (
      <div className="gradient-border relative aspect-video w-full overflow-hidden">
        <Image
          src={slot.thumbnail_url}
          alt={slot.title}
          fill
          unoptimized
          sizes="(min-width: 768px) 640px, 100vw"
          className="object-cover"
        />
        {(showLive || showAlwaysOn) && (
          <div className="absolute right-3 top-3">
            {showLive ? <LiveBadge /> : <AlwaysOnBadge />}
          </div>
        )}
      </div>
    );
  }
  if (slot.avatar_url) {
    return (
      <div className="gradient-border relative flex aspect-video w-full items-center justify-center overflow-hidden bg-background-highlight">
        <Image
          src={slot.avatar_url}
          alt={`${slot.streamer_name} avatar`}
          width={160}
          height={160}
          unoptimized
          className="rounded-full border-2 border-accent-cyan/40 glow-cyan"
        />
        {(showLive || showAlwaysOn) && (
          <div className="absolute right-3 top-3">
            {showLive ? <LiveBadge /> : <AlwaysOnBadge />}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="gradient-border relative flex aspect-video w-full items-center justify-center overflow-hidden bg-background-highlight">
      <InitialsAvatar name={slot.streamer_name} size={160} />
      {(showLive || showAlwaysOn) && (
        <div className="absolute right-3 top-3">
          {showLive ? <LiveBadge /> : <AlwaysOnBadge />}
        </div>
      )}
    </div>
  );
}

function StreamerRow({ slot, className = '' }: { slot: PublicStreamSlot; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {slot.avatar_url ? (
        <Image
          src={slot.avatar_url}
          alt=""
          width={48}
          height={48}
          unoptimized
          className="rounded-full border border-accent-cyan/30"
        />
      ) : (
        <InitialsAvatar name={slot.streamer_name} size={48} />
      )}
      <div className="text-lg font-semibold text-text-primary">{slot.streamer_name}</div>
    </div>
  );
}

function ReasoningBox({ reasoning }: { reasoning: string | undefined }) {
  return (
    <section
      aria-labelledby="reasoning-heading"
      className="gradient-border mt-6 bg-background-highlight p-4"
    >
      <h3
        id="reasoning-heading"
        className="text-sm font-semibold uppercase tracking-wider text-accent-cyan mb-2"
      >
        Why this prediction?
      </h3>
      {reasoning ? (
        <p className="text-sm leading-relaxed text-text-secondary">{reasoning}</p>
      ) : (
        <p className="text-sm italic text-text-muted">No detailed reasoning available.</p>
      )}
    </section>
  );
}

function WatchButtons({ slot }: { slot: PublicStreamSlot }) {
  const twitchUrl = slot.twitch_login ? `https://twitch.tv/${slot.twitch_login}` : null;
  const youtubeUrl = slot.youtube_channel_id
    ? `https://youtube.com/channel/${slot.youtube_channel_id}`
    : null;

  if (!twitchUrl && !youtubeUrl) return null;

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      {twitchUrl && (
        <a
          href={twitchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-twitch/40 bg-twitch/15 px-4 py-3 text-sm font-semibold text-twitch-fg transition-colors hover:bg-twitch/25"
        >
          Watch on Twitch
        </a>
      )}
      {youtubeUrl && (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-youtube/40 bg-youtube/15 px-4 py-3 text-sm font-semibold text-youtube-fg transition-colors hover:bg-youtube/25"
        >
          Watch on YouTube
        </a>
      )}
    </div>
  );
}
