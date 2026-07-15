import type { Platform, ConfidenceLevel } from '@/lib/server/partner-api';
import { slotLexFor } from '@/lib/i18n-slot';

// `language` localizes aria/label text on the streamer page; the default 'en'
// keeps every existing caller (home, /live, /game, feed) byte-identical.
// The visible "LIVE" and "24/7" badge texts stay untranslated by design.

export function LiveBadge({
  className = '',
  language = 'en',
}: {
  className?: string;
  language?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded bg-live px-2 py-0.5 text-xs font-bold uppercase tracking-[0.1em] text-black glow-green ${className}`}
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
  size?: 'sm' | 'md';
  /** When set, the badge becomes an external link to the streamer's channel. */
  href?: string;
  /** Localizes the sr-only "opens in new tab" hint (link variant only). */
  language?: string;
}) {
  const bg = platform === 'twitch' ? 'bg-twitch' : 'bg-youtube';
  const label = platform === 'twitch' ? 'Twitch' : 'YouTube';
  const sizing =
    size === 'sm' ? 'px-1 py-px text-[9px]' : 'px-1.5 py-0.5 text-[10px]';
  const base = `inline-flex items-center rounded-[3px] font-semibold text-white ${bg} ${sizing}`;
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} transition-opacity hover:opacity-80`}
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
      ? 'px-1.5 py-px text-[9px] tracking-wider'
      : 'px-2 py-0.5 text-xs tracking-[0.1em]';
  return (
    <span
      className={`inline-flex items-center rounded font-bold uppercase ${CONFIDENCE_STYLES[level]} ${sizing}`}
      aria-label={L.confidenceAria(level)}
    >
      {L.confidenceLabels[level]}
    </span>
  );
}

export function AlwaysOnBadge() {
  return (
    <span className="inline-flex items-center rounded-[3px] bg-accent-cyan px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
      24/7
    </span>
  );
}
