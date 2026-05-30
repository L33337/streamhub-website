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

export function PlatformBadge({ platform }: { platform: Platform }) {
  const bg = platform === 'twitch' ? 'bg-twitch' : 'bg-youtube';
  const label = platform === 'twitch' ? 'Twitch' : 'YouTube';
  return (
    <span
      className={`inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold text-white ${bg}`}
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

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-[0.1em] ${CONFIDENCE_STYLES[level]}`}
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
