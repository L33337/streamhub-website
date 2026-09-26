import type { Platform, ConfidenceLevel } from '@/lib/server/partner-api';
import { slotLexFor } from '@/lib/i18n-slot';

// `language` localizes aria/label text on the streamer page; the default 'en'
// keeps every existing caller (home, /live, /game, feed) byte-identical.
// The visible "LIVE" and "24/7" badge texts stay untranslated by design.
//
// Two layout invariants every badge here shares:
//   `shrink-0` — badges sit in flex rows next to a `truncate` name. Without it
//   flexbox shrinks the badge (a short, unwrappable word) instead of the label
//   that has somewhere to go, so "LIVE" clipped mid-word on narrow phones.
//   Font floor 10px — the dense `sm` scale used to be 9px, below what is
//   comfortably legible on a phone.

export function LiveBadge({
  className = '',
  language = 'en',
  size = 'md',
}: {
  className?: string;
  language?: string;
  /** 'sm' matches PlatformBadge's sm scale for dense list/table rows. */
  size?: 'sm' | 'md';
}) {
  const sizing = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded bg-live font-bold uppercase tracking-[0.1em] text-black glow-green ${sizing} ${className}`}
      aria-label={slotLexFor(language).liveBadgeAria}
    >
      LIVE
    </span>
  );
}

export function PlatformBadge({
  platform,
  size = 'md',
  href,
  language = 'en',
}: {
  platform: Platform;
  /**
   * 'xs' (game-hub compact rows, 2026-09-24): same 10px font floor as 'sm',
   * tighter padding, so two badges fit a 320px row next to a title.
   */
  size?: 'xs' | 'sm' | 'md';
  /** When set, the badge becomes an external link to the streamer's channel. */
  href?: string;
  /** Localizes the sr-only "opens in new tab" hint (link variant only). */
  language?: string;
}) {
  const bg = platform === 'twitch' ? 'bg-twitch' : 'bg-youtube';
  const label = platform === 'twitch' ? 'Twitch' : 'YouTube';
  const sizing =
    size === 'xs'
      ? 'px-1 py-px text-[10px] leading-3'
      : size === 'sm'
        ? 'px-1.5 py-0.5 text-[10px]'
        : 'px-1.5 py-0.5 text-[11px]';
  const base = `inline-flex shrink-0 items-center rounded-[3px] font-semibold text-white ${bg} ${sizing}`;
  if (href) {
    // Linked badges are 19-21 px tall; the ::before adds 6 px above and below
    // (streamer-page UX round, 2026-09-26: WCAG 2.5.8 wants 24) without moving
    // anything. Every caller leaves at least 8 px around a badge row, so the
    // enlarged areas never overlap a neighbour. `data-hit-expand` tells the
    // layout audits (scripts/perf/*-audit.mjs) to count the extra 12 px.
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-hit-expand="12"
        className={`${base} relative transition-opacity before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] hover:opacity-80`}
      >
        {label}
        <span className="sr-only">{slotLexFor(language).opensInNewTab}</span>
      </a>
    );
  }
  return <span className={base}>{label}</span>;
}

const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  high: 'bg-confidence-high/15 text-confidence-high',
  medium: 'bg-confidence-medium/15 text-confidence-medium',
  low: 'bg-confidence-low/15 text-confidence-low',
};

export function ConfidenceBadge({
  level,
  size = 'md',
  language = 'en',
}: {
  level: ConfidenceLevel;
  size?: 'sm' | 'md';
  language?: string;
}) {
  const L = slotLexFor(language);
  const sizing =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-[10px] tracking-wider'
      : 'px-2 py-0.5 text-xs tracking-[0.1em]';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded font-bold uppercase ${CONFIDENCE_STYLES[level]} ${sizing}`}
      aria-label={L.confidenceAria(level)}
    >
      {L.confidenceLabels[level]}
    </span>
  );
}

export function AlwaysOnBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-[3px] bg-accent-cyan px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
      24/7
    </span>
  );
}

// Program-page slot-kind badges (app SlotKindBadge.tsx / UncertainBadge port).
// Visible texts stay untranslated like LIVE/24/7 — the gated Program page
// renders English chrome.

/** Streamer announced they will NOT stream on this usually-regular day. */
export function CancelledBadge({ language = 'en' }: { language?: string } = {}) {
  return (
    <span className="inline-flex shrink-0 items-center rounded bg-confidence-low/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-confidence-low">
      {slotLexFor(language).cancelledBadge}
    </span>
  );
}

/** Prediction on a day the streamer does not normally stream. */
export function NewBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded bg-accent-cyan/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-cyan">
      New
    </span>
  );
}

/** Streak demotion: the streamer missed their last 2+ predicted streams. */
export function UncertainBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded bg-confidence-medium/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-confidence-medium">
      Uncertain
    </span>
  );
}
