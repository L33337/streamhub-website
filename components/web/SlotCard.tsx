import Image from 'next/image';
import Link from 'next/link';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { formatCompactNumber } from '@/lib/format/number';
import { slotLexFor } from '@/lib/i18n-slot';
import { localeHref, resolveUiLang } from '@/lib/i18n-core';
import { pickReasoning } from '@/lib/slot-copy';
import {
  AlwaysOnBadge,
  ConfidenceBadge,
  LiveBadge,
  PlatformBadge,
} from './Badges';
import { SlotStatusText } from './SlotStatusText';

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
// /game, feed) byte-identical.
export function SlotCard({
  slot,
  language = 'en',
}: {
  slot: PublicStreamSlot;
  language?: string;
}) {
  const isLive = slot.status === 'live';

  return (
    <Link
      href={localeHref(resolveUiLang(language), `/schedule/${encodeURIComponent(slot.id)}`)}
      prefetch={false}
      className="block transition-transform hover:scale-[1.01] focus-visible:scale-[1.01] focus-visible:outline-none"
      aria-label={`${slot.streamer_name}: ${slot.title}`}
    >
      <article
        className={`flex gap-3 rounded-xl bg-background-elevated p-3 ${
          isLive
            ? 'border-l-[3px] border-live glow-green-strong'
            : 'gradient-border glow-cyan'
        }`}
      >
        <div className="relative aspect-[3/2] w-28 flex-shrink-0 overflow-hidden rounded-lg bg-background-highlight sm:w-36 md:w-44 lg:w-56">
          {slot.thumbnail_url ? (
            <Image
              src={slot.thumbnail_url}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 224px, (min-width: 768px) 176px, (min-width: 640px) 144px, 112px"
              className="object-cover"
            />
          ) : slot.avatar_url ? (
            <Image
              src={slot.avatar_url}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 224px, (min-width: 768px) 176px, (min-width: 640px) 144px, 112px"
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

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs text-text-secondary">
                <SlotStatusText slot={slot} language={language} />
              </span>
              {isLive && slot.is_always_on && <AlwaysOnBadge />}
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
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-text-muted">
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
