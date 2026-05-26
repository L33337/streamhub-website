import type { Platform, ConfidenceLevel } from '@/lib/server/partner-api';

export function LiveBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-live/15 border border-live/40 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-live glow-green ${className}`}
      aria-label="Currently live"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-pulse-glow rounded-full bg-live opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
      </span>
      LIVE
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  const styles =
    platform === 'twitch'
      ? 'bg-twitch/15 border-twitch/40 text-twitch-fg'
      : 'bg-youtube/15 border-youtube/40 text-youtube-fg';
  const label = platform === 'twitch' ? 'Twitch' : 'YouTube';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  high: 'bg-live/15 border-live/40 text-live',
  medium: 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan',
  low: 'bg-text-muted/15 border-text-muted/40 text-text-muted',
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[level]}`}
    >
      {CONFIDENCE_LABELS[level]}
    </span>
  );
}

export function PredictedBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-accent-purple/40 bg-accent-purple/15 px-2 py-0.5 text-xs font-medium text-accent-purple">
      AI Predicted
    </span>
  );
}

export function AlwaysOnBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-accent-cyan">
      24/7
    </span>
  );
}
