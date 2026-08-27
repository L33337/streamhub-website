import Image from 'next/image';
import Link from 'next/link';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import {
  AlwaysOnBadge,
  CancelledBadge,
  ConfidenceBadge,
  LiveBadge,
  PlatformBadge,
} from './Badges';
import { sizedAvatarUrl, sizedCdnImageUrl } from '@/lib/format/image-size';
import { InitialsAvatar } from './InitialsAvatar';
import { LocalTime } from './LocalTime';
import { WatchButtons } from './WatchButtons';
import { slotLexFor } from '@/lib/i18n-slot';
import { chromeLexFor } from '@/lib/i18n-chrome';
import { localeHref, resolveUiLang } from '@/lib/i18n-core';
import { pickReasoning } from '@/lib/slot-copy';

function formatDuration(minutes: number): string | null {
  if (minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}min`;
}

export function StreamSlotDetail({
  slot,
  language = 'en',
}: {
  slot: PublicStreamSlot;
  // M22: viewer locale — localizes the reasoning-box heading; the default
  // keeps every pre-M22 caller byte-identical.
  language?: string;
}) {
  const isLive = slot.status === 'live';
  const isAlwaysOn = slot.is_always_on;
  // M15 cancelled prediction: the streamer announced they will NOT stream at
  // this usually-regular time — no watch buttons, "Usually streams" label.
  const isCancelled = slot.slot_kind === 'cancelled';
  const durationLabel = isAlwaysOn ? null : formatDuration(slot.duration_minutes);
  const startLabel = isCancelled ? 'Usually streams:' : isLive ? 'Started:' : 'Scheduled:';
  const durationPrefix = isLive ? '' : '~';

  return (
    <article className="p-4 sm:p-6 md:p-8">
      <HeroThumbnail slot={slot} />

      <StreamerRow slot={slot} className="mt-4 sm:mt-5" />

      <h1
        id="slot-detail-title"
        className="mt-3 text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight sm:mt-4"
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
                <LocalTime utcIso={slot.start_time} language={language} />
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

      {isCancelled && (
        <p className="mt-3 text-sm text-text-secondary">
          No stream expected — the streamer announced they will not stream at
          this usually-regular time.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {slot.platforms.map((p) => (
          <PlatformBadge key={p} platform={p} />
        ))}
        {isAlwaysOn && <AlwaysOnBadge />}
        {isCancelled && <CancelledBadge />}
        {!isLive && <ConfidenceBadge level={slot.confidence} />}
      </div>

      {!isLive && <ReasoningBox slot={slot} language={language} />}

      {!isCancelled && (
        <WatchButtons
          twitchLogin={slot.twitch_login}
          youtubeChannelId={slot.youtube_channel_id}
        />
      )}
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
          // 640px is the widest this hero gets (see the sizes prop below).
          src={sizedCdnImageUrl(slot.thumbnail_url, 640)}
          // `title` is typed non-null but the API does return "" for slots the
          // enrichment has not filled in yet — and an empty alt reads as a
          // missing one to Bing. Same fallback as SlotCard.
          alt={slot.title?.trim() || slot.streamer_name}
          fill
          unoptimized
          // LCP element on live-slot pages (Lighthouse 2026-07-13: without
          // priority it lazy-loads — 1.4 s load delay on mobile). Prediction
          // slots have no thumbnail_url and their LCP is a text <p>, so this
          // branch never competes with them.
          priority
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
          src={sizedAvatarUrl(slot.avatar_url, 160)}
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
    <Link
      href={`/streamer/${encodeURIComponent(slot.streamer_id)}`}
      prefetch={false}
      aria-label={`Open ${slot.streamer_name}'s page`}
      className={`group inline-flex items-center gap-3 rounded-lg transition-colors hover:bg-background-highlight focus-visible:bg-background-highlight focus-visible:outline-none ${className}`}
    >
      {slot.avatar_url ? (
        <Image
          src={sizedAvatarUrl(slot.avatar_url, 48)}
          // The Link's aria-label already names the target, so this costs
          // screen readers nothing and gains the crawler image context.
          alt={slot.streamer_name}
          width={48}
          height={48}
          unoptimized
          className="rounded-full border border-accent-cyan/30 transition-colors group-hover:border-accent-cyan"
        />
      ) : (
        <InitialsAvatar name={slot.streamer_name} size={48} />
      )}
      <div className="text-lg font-semibold text-text-primary transition-colors group-hover:text-accent-cyan">
        {slot.streamer_name}
      </div>
    </Link>
  );
}

function ReasoningBox({
  slot,
  language,
}: {
  slot: PublicStreamSlot;
  language: string;
}) {
  // M22 P3 (S3.6): reasoning in a third language falls back to the labelled
  // always-English generic summary instead of showing e.g. Japanese text
  // under German chrome.
  const picked = pickReasoning(slot, language);
  if (!picked) return null;
  const uiLang = resolveUiLang(language);
  const textLang = picked.lang && picked.lang !== uiLang ? picked.lang : undefined;
  return (
    <section
      aria-labelledby="reasoning-heading"
      className="gradient-border mt-6 bg-background-highlight p-4"
    >
      <h3
        id="reasoning-heading"
        className="text-sm font-semibold uppercase tracking-wider text-accent-cyan mb-2"
      >
        {slotLexFor(language).whyThisPrediction}
      </h3>
      {picked.isGeneric && (
        <p className="mb-2 text-xs text-text-muted">
          {slotLexFor(language).autoSummary}
        </p>
      )}
      <div className="space-y-3 text-sm leading-relaxed text-text-secondary" lang={textLang}>
        {picked.text
          .split(/\n\s*\n/)
          .map((para) => para.trim())
          .filter(Boolean)
          .map((para, i) => (
            <p key={i}>{para}</p>
          ))}
      </div>
      {/* Pointer to the public methodology page (2026-08-27). Chrome string →
          viewer locale (D6); the chrome lexicon is server-safe here. */}
      <p className="mt-3 text-xs">
        <Link
          href={localeHref(uiLang, '/methodology/predictions')}
          className="font-semibold text-accent-cyan hover:text-text-primary"
        >
          {chromeLexFor(uiLang).footer.howPredictionsWork} →
        </Link>
      </p>
    </section>
  );
}

