import { hubLexFor } from '@/lib/i18n-hub';
import type { UiLang } from '@/lib/i18n-core';
import { StoreBadges } from './StoreBadges';

function todayLabel(locale: UiLang): string {
  return new Date()
    .toLocaleDateString(locale === 'en' ? 'en-US' : locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase();
}

/**
 * Compact homepage masthead (rebuild 2026-07-27): the former full-screen app
 * hero shrunk to an overline, the unchanged H1/claim, a live ticker chip and
 * small store badges (E1). The phone screenshot + QR moved to HomeEndCap.
 * ISR page → the date label re-renders every 60 s, which is fresh enough.
 */
export function HomeMasthead({
  locale = 'en',
  liveCount,
  soonCount,
  soonHours,
}: {
  locale?: UiLang;
  liveCount: number;
  soonCount: number;
  soonHours: number;
}) {
  const L = hubLexFor(locale);
  const showTicker = liveCount > 0 || soonCount > 0;

  return (
    <section className="border-b border-divider pb-6 pt-2">
      <p className="hero-overline">
        <span className="iso">{todayLabel(locale)}</span>
        <span className="sep" />
        {L.hero.kicker}
      </p>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white/95 md:text-4xl">
            {L.hero.titleLead}
            <span className="text-accent-cyan [text-shadow:0_0_16px_rgba(0,240,255,0.45)]">
              Twitch &amp; YouTube
            </span>
            {L.hero.titleTail}
          </h1>
          <p className="mt-2 text-lg font-semibold text-white/60">{L.hero.subtitle}</p>
          {showTicker && (
            <p className="hero-live-chip mt-4">
              <span className="live-pulse-dot" aria-hidden="true" />
              {L.homeFeed.ticker(liveCount, soonCount, soonHours)}
            </p>
          )}
        </div>

        <StoreBadges locale={locale} className="shrink-0" />
      </div>
    </section>
  );
}
