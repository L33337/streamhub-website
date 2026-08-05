import Image from 'next/image';
import Link from 'next/link';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { sizedAvatarUrl, sizedCdnImageUrl } from '@/lib/format/image-size';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { slotLexFor } from '@/lib/i18n-slot';
import { formatClockReading } from '@/lib/tonight/logic';
import { CancelledBadge, ConfidenceBadge, PlatformBadge } from '@/components/web/Badges';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { TonightClock } from './TonightLocal';

/**
 * One card of the prime-time highlight box — the page's editorial moment, the
 * "Tipps des Abends" of a printed TV guide.
 *
 * Deliberately NOT `SlotCard`: that card is a dense listing row (thumbnail
 * beside text) and these four sit above a page full of them. A poster-shaped
 * card with the start time as its loudest element is what makes the box read as
 * a highlight rather than as the first four rows of the listing.
 *
 * A server component, so the whole box is crawlable HTML; only the clock
 * reading swaps to the viewer's zone after hydration (TonightClock).
 */
export function PrimetimeCard({
  slot,
  locale,
  timeZone,
  referenceOffsetMinutes,
}: {
  slot: PublicStreamSlot;
  locale: UiLang;
  /** Reference zone the server-rendered time is in. */
  timeZone: string;
  referenceOffsetMinutes: number;
}) {
  const startMs = Date.parse(slot.start_time);
  const ssrTime = Number.isFinite(startMs)
    ? formatClockReading(startMs, locale, timeZone)
    : '';
  const isCancelled = slot.slot_kind === 'cancelled';

  return (
    <Link
      href={localeHref(locale, `/schedule/${encodeURIComponent(slot.id)}`)}
      prefetch={false}
      className="group block transition-transform focus-visible:outline-none motion-safe:hover:scale-[1.01] motion-safe:focus-visible:scale-[1.01]"
      aria-label={`${ssrTime} ${slot.streamer_name}: ${slot.title}`}
    >
      <article
        className={`flex h-full flex-col overflow-hidden rounded-xl bg-background-elevated ${
          isCancelled
            ? 'border-l-[3px] border-confidence-low opacity-55'
            : 'gradient-border glow-cyan'
        }`}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-background-highlight">
          {slot.thumbnail_url ? (
            <Image
              src={sizedCdnImageUrl(slot.thumbnail_url, 400)}
              // Primary visual of the card → carries the entity text. Kept
              // language-neutral by construction (a stream title or a channel
              // name), never an English chrome phrase.
              alt={slot.title?.trim() || slot.streamer_name}
              fill
              unoptimized
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : slot.avatar_url ? (
            <Image
              src={sizedAvatarUrl(slot.avatar_url, 400)}
              alt={slot.streamer_name}
              fill
              unoptimized
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <InitialsAvatar
              name={slot.streamer_name}
              size={96}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-lg font-bold tabular-nums text-accent-cyan">
              <TonightClock
                startIso={slot.start_time}
                ssr={ssrTime}
                locale={locale}
                referenceOffsetMinutes={referenceOffsetMinutes}
              />
            </span>
            <span className="truncate text-sm font-semibold text-text-primary group-hover:text-accent-cyan">
              {slot.streamer_name}
            </span>
          </div>
          <h3
            className="line-clamp-2 text-xs font-medium uppercase tracking-wide text-text-secondary"
            title={slot.title}
          >
            {slot.title}
          </h3>
          {slot.category ? (
            <p className="truncate text-xs text-text-muted">{slot.category}</p>
          ) : null}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
            <div className="flex flex-wrap items-center gap-1">
              {slot.platforms.map((p) => (
                <PlatformBadge key={p} platform={p} size="sm" />
              ))}
            </div>
            {isCancelled ? (
              <CancelledBadge />
            ) : (
              <div className="flex min-w-0 items-center gap-1">
                <span className="sr-only">{slotLexFor(locale).confidencePrefix}</span>
                <ConfidenceBadge level={slot.confidence} size="sm" language={locale} />
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
