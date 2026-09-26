'use client';

import { useSyncExternalStore } from 'react';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { firstCurrentSlotIndex, localNextLabel, localizedNextLabel } from '@/lib/format/time';
import { slotLexFor } from '@/lib/i18n-slot';

function subscribe(): () => void {
  return () => {};
}

/** The slot fields the pill reads. A Pick so the wiki's live island (which
 *  builds slots from a PostgREST row, not the Partner API DTO) can feed it. */
export type HeroNextSlot = Pick<
  PublicStreamSlot,
  'start_time' | 'category' | 'confidence' | 'platforms' | 'is_predicted' | 'slot_kind'
>;

interface Props {
  /** Earliest real upcoming slot that has a rendered day section, else null. */
  nextSlot: HeroNextSlot | null;
  /**
   * The next few real slots after `nextSlot`, in order. When the snapshot is
   * stale and `nextSlot` started more than NEXT_SLOT_GRACE_MS ago, the browser
   * moves on to the first of these that is still current (or hides the pill).
   * Optional: without it a stale pill simply disappears.
   */
  laterSlots?: readonly HeroNextSlot[];
  language?: string;
  /** Link target. Default: the slot's day section on the current page; the
   *  wiki page points it at the profile-page schedule instead. */
  href?: string;
  /** Wiki page: drop a category that is not trustworthy as "the game".
   *  (1) LOW-confidence predictions: the time of such a slot is a pattern
   *  guess and its category the weakest part of it; an encyclopedic page
   *  naming "Gambling" for a shooter streamer costs more trust than the chip
   *  is worth. (2) Slots without Twitch: YouTube reports a video bucket
   *  ("Gaming"), never a game; decided by platform, never by name (Twitch has
   *  real categories called "Music" and "Sports"). The profile page keeps
   *  both: the slot card right below carries the confidence badge. */
  hideUncertainCategory?: boolean;
}

/**
 * The answer a visitor arriving from "<streamer> stream schedule" came for,
 * placed above the fold: when is the next stream, in their own timezone.
 *
 * Shaped as a pill so it belongs to the hero's badge/chip vocabulary rather
 * than sitting in it as a boxed panel. One type size throughout — the emphasis
 * comes from weight and colour, not from a second size, so the row stays calm
 * while the time still leads.
 *
 * Times follow the SSR/hydration split used across this page: the server
 * renders the deterministic UTC form, the browser swaps in viewer-local.
 *
 * Live streamers render nothing here — the hero promotes the watch buttons
 * instead, which is the only action that matters mid-stream.
 */
export function HeroNextStream({
  nextSlot,
  laterSlots,
  language = 'en',
  href,
  hideUncertainCategory = false,
}: Props) {
  const L = slotLexFor(language);
  const candidates: HeroNextSlot[] = nextSlot ? [nextSlot, ...(laterSlots ?? [])] : [];
  // Stale-snapshot guard (streamer-page UX round, 2026-09-26): the server
  // renders `nextSlot`; the browser skips slots whose start is more than two
  // hours past. A number, so the snapshot is stable between calls.
  const index = useSyncExternalStore(
    subscribe,
    () => firstCurrentSlotIndex(candidates, Date.now()),
    () => (candidates.length > 0 ? 0 : -1),
  );
  const slot = index >= 0 ? candidates[index] : null;
  const target = slot?.start_time ?? '';
  const label = useSyncExternalStore(
    subscribe,
    () => (target ? localNextLabel(target, language) : ''),
    () => (target ? localizedNextLabel(target, language) : ''),
  );

  if (!slot) return null;
  const untrusted =
    (slot.is_predicted && slot.confidence === 'low') || !slot.platforms.includes('twitch');
  const category = hideUncertainCategory && untrusted ? null : slot.category;

  return (
    <a
      href={href ?? `#day-${slot.start_time.slice(0, 10)}`}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-accent-cyan/40 bg-accent-cyan/5 px-3 py-1.5 text-sm transition-colors hover:border-accent-cyan/70 hover:bg-accent-cyan/10"
    >
      <span className="shrink-0 text-text-muted">{L.nextStreamPrefix}</span>
      <time
        dateTime={slot.start_time}
        suppressHydrationWarning
        className="shrink-0 font-semibold text-accent-cyan"
      >
        {slot.is_predicted ? `~ ${label}` : label}
      </time>
      {/* Category from `sm` up only: on a 390px phone it was truncated to
          "Leag…" (streamer-page UX round, 2026-09-26). The slot card the pill
          links to names it in full. */}
      {category && (
        <>
          <span aria-hidden="true" className="hidden shrink-0 text-text-muted sm:inline">
            ·
          </span>
          {/* Only this part may shrink, so a long category never wraps the pill. */}
          <span className="hidden truncate text-text-secondary sm:inline">{category}</span>
        </>
      )}
      <span
        aria-hidden="true"
        className="shrink-0 text-accent-cyan transition-transform group-hover:translate-x-0.5"
      >
        →
      </span>
    </a>
  );
}
