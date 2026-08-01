import Image from 'next/image';
import Link from 'next/link';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { formatCompactNumber } from '@/lib/format/number';
import { slotLexFor } from '@/lib/i18n-slot';
import { localeHref, resolveUiLang } from '@/lib/i18n-core';
import type { SlotStatusInput } from '@/lib/format/slot-status';
import { pickReasoning, type SlotCopyFields } from '@/lib/slot-copy';
import {
  AlwaysOnBadge,
  CancelledBadge,
  ConfidenceBadge,
  LiveBadge,
  PlatformBadge,
} from './Badges';
import { sizedAvatarUrl, sizedCdnImageUrl } from '@/lib/format/image-size';
import { SlotStatusText } from './SlotStatusText';

/**
 * Exactly the slot fields this card renders — narrower than `PublicStreamSlot`
 * on purpose, so the homepage can hand it a pruned payload
 * (`lib/home/slot-payload.ts`, which pays for every field once per deferred
 * card in the RSC flight). Every other caller passes a full DTO, which is
 * assignable. Adding a field to the card means adding it here, and that is the
 * point: the pruner then fails to compile instead of shipping `undefined`.
 */
export type SlotCardSlot = SlotStatusInput &
  SlotCopyFields &
  Pick<
    PublicStreamSlot,
    | 'id'
    | 'streamer_name'
    | 'title'
    | 'category'
    | 'platforms'
    | 'thumbnail_url'
    | 'avatar_url'
    | 'confidence'
    | 'viewer_count'
  >;

function PlaceholderThumbnail({ name }: { name: string }) {
  const letter = (name?.trim()?.[0] ?? '?').toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-purple/40 to-accent-cyan/30 text-2xl font-bold text-white"
    >
      {letter}
    </div>
  );
}

// `language` localizes the card chrome (status line, confidence) on the
// streamer page; the default 'en' keeps every existing caller (home, /live,
// /game, feed) byte-identical. `topBadges` is a Program-page extension
// (CANCELLED/NEW/UNCERTAIN badge row) — the default leaves all other callers
// untouched.
export function SlotCard({
  slot,
  language = 'en',
  topBadges,
  compact = false,
  reserveTopRight = false,
}: {
  slot: SlotCardSlot;
  language?: string;
  /** Extra badges rendered next to the status line (CANCELLED/NEW/UNCERTAIN). */
  topBadges?: React.ReactNode;
  /**
   * Caps the thumbnail at its small-viewport size — for two-column layouts
   * (feed Up Next) where the viewport-based md/lg growth would crowd the
   * text column. Default keeps every existing caller byte-identical.
   */
  compact?: boolean;
  /**
   * Set when the caller overlays a control on the card's top-right corner (the
   * home feed's bell). Reserves room on the status line, which otherwise ran
   * underneath it and read "… around 12am your ti".
   */
  reserveTopRight?: boolean;
}) {
  const isLive = slot.status === 'live';
  const thumbWidthClass = compact
    ? 'w-28 sm:w-36'
    : 'w-28 sm:w-36 md:w-44 lg:w-56';
  const thumbSizes = compact
    ? '(min-width: 640px) 144px, 112px'
    : '(min-width: 1024px) 224px, (min-width: 768px) 176px, (min-width: 640px) 144px, 112px';
  // Cancelled treatment comes straight from the Partner-API DTO field (also
  // set by the feed/Program adapter toPublicStreamSlot): greyed card, red
  // border, badge; SlotStatusText renders the localized "No stream expected"
  // line from the same field.
  const isCancelled = slot.slot_kind === 'cancelled';
  // Auto-badge for API-driven cancelled slots; callers passing topBadges
  // (Program page) own the badge row themselves.
  const badges =
    topBadges ?? (isCancelled ? <CancelledBadge /> : undefined);

  return (
    <Link
      href={localeHref(resolveUiLang(language), `/schedule/${encodeURIComponent(slot.id)}`)}
      prefetch={false}
      className="block transition-transform focus-visible:outline-none motion-safe:hover:scale-[1.01] motion-safe:focus-visible:scale-[1.01]"
      aria-label={`${slot.streamer_name}: ${slot.title}`}
    >
      <article
        className={`flex gap-3 rounded-xl bg-background-elevated p-3 ${
          isCancelled
            ? 'border-l-[3px] border-confidence-low opacity-55'
            : isLive
              ? 'border-l-[3px] border-live glow-green-strong'
              : 'gradient-border glow-cyan'
        }`}
      >
        <div
          className={`relative aspect-[3/2] ${thumbWidthClass} flex-shrink-0 overflow-hidden rounded-lg bg-background-highlight`}
        >
          {slot.thumbnail_url ? (
            <Image
              // The widest bucket of thumbSizes (224px at lg, 144px compact).
              src={sizedCdnImageUrl(slot.thumbnail_url, compact ? 144 : 224)}
              alt={slot.title?.trim() || slot.streamer_name}
              fill
              unoptimized
              sizes={thumbSizes}
              className="object-cover"
            />
          ) : slot.avatar_url ? (
            <Image
              src={sizedAvatarUrl(slot.avatar_url, compact ? 144 : 224)}
              alt={slot.streamer_name}
              fill
              unoptimized
              sizes={thumbSizes}
              className="object-cover"
            />
          ) : (
            <PlaceholderThumbnail name={slot.streamer_name} />
          )}
          {isLive && (
            <div className="absolute bottom-1 left-1 flex items-center gap-1">
              <LiveBadge language={language} />
              {/* Live concurrent viewers — the API already guarantees this is
                  non-null only on live slots with a fresh (<25 min) sample. */}
              {slot.viewer_count != null && (
                <span className="rounded bg-black/70 px-1 py-0.5 text-[9px] font-semibold text-white">
                  {formatCompactNumber(slot.viewer_count)} watching
                </span>
              )}
            </div>
          )}
        </div>

        {/* Container context for the confidence line below: whether the
            "Confidence:" label fits depends on how wide THIS column is (the
            thumbnail is fixed, the card is not), and the label is a single
            unbreakable word in several locales — "Prawdopodobieństwo:" alone
            is 134px. A viewport breakpoint would guess wrong on the Program
            page, where the same card sits in a narrower grid cell. */}
        <div className="@container flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="min-w-0">
            <div
              className={`flex min-w-0 items-center gap-2 ${reserveTopRight ? 'pr-8' : ''}`}
            >
              <span className="truncate text-xs text-text-secondary">
                <SlotStatusText slot={slot} language={language} />
              </span>
              {isLive && slot.is_always_on && <AlwaysOnBadge />}
              {badges}
            </div>
            <h3
              className="mt-1 text-sm font-bold uppercase tracking-wide text-text-primary line-clamp-2"
              title={slot.title}
            >
              {slot.title}
            </h3>
            <p className="truncate text-xs text-text-secondary">
              {slot.streamer_name}
            </p>
            {slot.category ? (
              <p className="truncate text-xs text-text-muted">{slot.category}</p>
            ) : null}
            {/* AI prediction reasoning — full sentence in the HTML (crawlable,
                unique copy per slot), clamped to two lines visually. M22 P3:
                copy in a third language falls back to the labelled English
                generic summary (pickReasoning). */}
            {(() => {
              const picked =
                !isLive && slot.is_predicted ? pickReasoning(slot, language) : null;
              if (!picked) return null;
              const textLang =
                picked.lang && picked.lang !== resolveUiLang(language)
                  ? picked.lang
                  : undefined;
              return (
                <p className="mt-1 text-xs text-text-muted line-clamp-2" lang={textLang}>
                  {picked.isGeneric ? (
                    <span className="text-text-muted/70">
                      {slotLexFor(language).autoSummary}:{' '}
                    </span>
                  ) : null}
                  {picked.text}
                </p>
              );
            })()}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex flex-wrap items-center gap-1">
              {slot.platforms.map((p) => (
                <PlatformBadge key={p} platform={p} size="sm" />
              ))}
            </div>
            {!isLive && (
              <div className="flex min-w-0 items-center gap-1">
                {/* Label only once the column can hold label + badge in every
                    locale (13rem covers the longest, pl). Below that the
                    colour-coded badge carries the meaning on its own —
                    without this the pair pushed the whole DOCUMENT wider than
                    a 320px phone in pl/de/ru. */}
                <span className="hidden text-[10px] uppercase tracking-wider text-text-muted @min-[13rem]:inline">
                  {slotLexFor(language).confidencePrefix}
                </span>
                <ConfidenceBadge level={slot.confidence} size="sm" language={language} />
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
