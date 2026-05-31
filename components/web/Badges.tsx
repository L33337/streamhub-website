import type { Platform, ConfidenceLevel } from '@/lib/server/partner-api';

export function LiveBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded bg-live px-2 py-0.5 text-xs font-bold uppercase tracking-[0.1em] text-black glow-green ${className}`}
      aria-label="Currently live"
    >
      LIVE
    </span>
  );
}

export function PlatformBadge({
  platform,
  size = 'md',
}: {
  platform: Platform;
  size?: 'sm' | 'md';
}) {
  const bg = platform === 'twitch' ? 'bg-twitch' : 'bg-youtube';
  const label = platform === 'twitch' ? 'Twitch' : 'YouTube';
  const sizing =
    size === 'sm' ? 'px-1 py-px text-[9px]' : 'px-1.5 py-0.5 text-[10px]';
  return (
    <span
      className={`inline-flex items-center rounded-[3px] font-semibold text-white ${bg} ${sizing}`}
    >
      {label}
    </span>
  );
}

const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  high: 'bg-confidence-high/15 text-confidence-high',
  medium: 'bg-confidence-medium/15 text-confidence-medium',
  low: 'bg-confidence-low/15 text-confidence-low',
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

export function ConfidenceBadge({
  level,
  size = 'md',
}: {
  level: ConfidenceLevel;
  size?: 'sm' | 'md';
}) {
  const sizing =
    size === 'sm'
      ? 'px-1.5 py-px text-[9px] tracking-wider'
      : 'px-2 py-0.5 text-xs tracking-[0.1em]';
  return (
    <span
      className={`inline-flex items-center rounded font-bold uppercase ${CONFIDENCE_STYLES[level]} ${sizing}`}
      aria-label={`${level} confidence`}
    >
      {CONFIDENCE_LABELS[level]}
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
