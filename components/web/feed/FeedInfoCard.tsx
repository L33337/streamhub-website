'use client';

import Link from 'next/link';
import {
  Sparkles,
  TrendingUp,
  Target,
  CalendarX2,
  Quote,
  Plane,
  Clock,
  BarChart3,
  Trophy,
  UserPlus,
} from 'lucide-react';

export type FeedInfoCardVariant =
  | 'interests-invite'
  | 'funfact'
  | 'trending'
  | 'schedule-change'
  | 'fan-moment'
  | 'break'
  | 'missed'
  | 'recap'
  | 'milestone'
  | 'new-streamer';

const VARIANT_ICON = {
  'interests-invite': Sparkles,
  funfact: Target,
  trending: TrendingUp,
  'schedule-change': CalendarX2,
  'fan-moment': Quote,
  break: Plane,
  missed: Clock,
  recap: BarChart3,
  milestone: Trophy,
  'new-streamer': UserPlus,
} as const;

/**
 * Info card (M16, port of the app's FeedInfoCard): interests invite
 * (cold start), prediction fun-fact, or trending-category hint. The CTA is
 * either a link (interests) or a button (trending → sets the chip).
 */
export function FeedInfoCard({
  variant,
  headline,
  body,
  stats,
  ctaLabel,
  ctaHref,
  onCtaClick,
}: {
  variant: FeedInfoCardVariant;
  headline: string;
  body?: string;
  /** Mini stat tiles (recap card) — rendered instead of / after the body. */
  stats?: Array<{ value: string; label: string }>;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
}) {
  const Icon = VARIANT_ICON[variant];

  const ctaClass =
    'mt-3 inline-flex items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/10 px-3 py-1.5 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors';

  return (
    <div className="mt-4 rounded-xl border border-border-default bg-background-elevated p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="shrink-0 text-accent-cyan" strokeWidth={2} />
        <h3 className="text-sm font-bold text-text-primary">{headline}</h3>
      </div>
      {/* Time-bearing bodies (schedule-change) format in the viewer's locale */}
      {body ? (
        <p className="mt-1.5 text-sm text-text-secondary" suppressHydrationWarning>
          {body}
        </p>
      ) : null}
      {stats && stats.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="min-w-[5.5rem] rounded-lg bg-background-highlight px-3 py-2"
            >
              <p className="truncate text-base font-bold text-text-primary">{stat.value}</p>
              <p className="truncate text-[11px] text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} className={ctaClass}>
          {ctaLabel}
        </Link>
      ) : ctaLabel && onCtaClick ? (
        <button type="button" onClick={onCtaClick} className={ctaClass}>
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}
