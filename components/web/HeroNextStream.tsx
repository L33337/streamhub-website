'use client';

import { useSyncExternalStore } from 'react';
import type { PublicStreamSlot } from '@/lib/server/partner-api';
import { localNextLabel, localizedNextLabel } from '@/lib/format/time';
import { slotLexFor } from '@/lib/i18n-slot';

function subscribe(): () => void {
  return () => {};
}

interface Props {
  /** Earliest real upcoming slot that has a rendered day section, else null. */
  nextSlot: PublicStreamSlot | null;
  language?: string;
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
export function HeroNextStream({ nextSlot, language = 'en' }: Props) {
  const L = slotLexFor(language);
  const target = nextSlot?.start_time ?? '';
  const label = useSyncExternalStore(
    subscribe,
    () => (target ? localNextLabel(target, language) : ''),
    () => (target ? localizedNextLabel(target, language) : ''),
  );

  if (!nextSlot) return null;

  return (
    <a
      href={`#day-${nextSlot.start_time.slice(0, 10)}`}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-accent-cyan/40 bg-accent-cyan/5 px-3 py-1.5 text-sm transition-colors hover:border-accent-cyan/70 hover:bg-accent-cyan/10"
    >
      <span className="shrink-0 text-text-muted">{L.nextStreamPrefix}</span>
      <time
        dateTime={nextSlot.start_time}
        suppressHydrationWarning
        className="shrink-0 font-semibold text-accent-cyan"
      >
        {nextSlot.is_predicted ? `~ ${label}` : label}
      </time>
      {nextSlot.category && (
        <>
          <span aria-hidden="true" className="shrink-0 text-text-muted">
            ·
          </span>
          {/* Only this part may shrink, so a long category never wraps the pill. */}
          <span className="truncate text-text-secondary">{nextSlot.category}</span>
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
