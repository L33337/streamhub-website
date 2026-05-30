import Image from 'next/image';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  AlwaysOnBadge,
  ConfidenceBadge,
  LiveBadge,
  PlatformBadge,
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
  const isLive = slot.status === 'live';
  const isAlwaysOn = slot.is_always_on;
  const durationLabel = isAlwaysOn ? null : formatDuration(slot.duration_minutes);
  const startLabel = isLive ? 'Started:' : 'Scheduled:';
  const durationPrefix = isLive ? '' : '~';

  return (
    <article className="p-6 md:p-8">
      <HeroThumbnail slot={slot} />

      <StreamerRow slot={slot} className="mt-5" />

      <h1
        id="slot-detail-title"
        className="mt-4 text-2xl md:text-3xl font-bold text-white leading-tight"
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
        {isAlwaysOn ? (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Schedule</dt>
            <dd className="flex items-center gap-1.5">
              <span className="text-text-muted">Streaming:</span>
              <AlwaysOnBadge />
            </dd>
          </div>
        ) : (
          <>
            <div>
              <dt className="sr-only">Start time</dt>
              <dd>
                <span className="text-text-muted">{startLabel}</span>{' '}
                <LocalTime utcIso={slot.start_time} />
              </dd>
            </div>
            {durationLabel && (
              <div>
                <dt className="sr-only">Duration</dt>
                <dd>
                  <span className="text-text-muted">Duration:</span> {durationPrefix}{durationLabel}
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
        {isAlwaysOn && <AlwaysOnBadge />}
        <ConfidenceBadge level={slot.confidence} />
      </div>

      {slot.reasoning && <ReasoningBox reasoning={slot.reasoning} />}

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

function ReasoningBox({ reasoning }: { reasoning: string }) {
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
      <p className="text-sm leading-relaxed text-text-secondary">{reasoning}</p>
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
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-twitch px-4 py-3 text-sm font-bold tracking-wide text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] transition-colors hover:bg-[#A266FF]"
        >
          Watch on Twitch
        </a>
      )}
      {youtubeUrl && (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-youtube px-4 py-3 text-sm font-bold tracking-wide text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] transition-colors hover:bg-[#FF3355]"
        >
          Watch on YouTube
        </a>
      )}
    </div>
  );
}
