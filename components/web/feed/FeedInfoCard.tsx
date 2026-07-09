'use client';

import Link from 'next/link';
import { Sparkles, TrendingUp, Target, CalendarX2 } from 'lucide-react';

export type FeedInfoCardVariant = 'interests-invite' | 'funfact' | 'trending' | 'schedule-change';

const VARIANT_ICON = {
  'interests-invite': Sparkles,
  funfact: Target,
  trending: TrendingUp,
  'schedule-change': CalendarX2,
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
  ctaLabel,
  ctaHref,
  onCtaClick,
}: {
  variant: FeedInfoCardVariant;
  headline: string;
  body: string;
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
      <p className="mt-1.5 text-sm text-text-secondary" suppressHydrationWarning>
        {body}
      </p>
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
