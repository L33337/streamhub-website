import Link from 'next/link';
import type { HomeQuickFacts as HomeQuickFactsData } from '@/lib/server/quick-facts';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { formatCompactNumber } from '@/lib/format/number';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';

interface FactCard {
  key: string;
  kickerClass: string;
  label: string;
  big: string;
  text: string;
  /** Streamer page link — the prediction aggregate has none. */
  href: string | null;
  highlight: boolean;
}

function formatUntilDate(iso: string, locale: UiLang): string {
  try {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : locale, {
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * "Quick facts" (homepage rebuild 2026-07-27): the anonymous siblings of the
 * feed's info cards — high-confidence prediction accuracy, weekly peak, M14
 * punctuality, next announced break. Each fact is optional; the section
 * hides below two cards so a lonely stat never dangles. NOTE: page.tsx
 * mirrors the two-card rule for the section-nav chip — keep them in sync.
 */
export function HomeQuickFacts({
  facts,
  locale = 'en',
}: {
  facts: HomeQuickFactsData;
  locale?: UiLang;
}) {
  const L = hubLexFor(locale);

  const cards: FactCard[] = [];
  if (facts.prediction) {
    cards.push({
      key: 'prediction',
      kickerClass: 'text-accent-cyan',
      label: L.homeFeed.factPredictionLabel,
      big: `${facts.prediction.pct} %`,
      text: L.homeFeed.factPrediction(facts.prediction.hits, facts.prediction.total),
      href: null,
      highlight: true,
    });
  }
  if (facts.peak) {
    cards.push({
      key: 'peak',
      kickerClass: 'text-live',
      label: L.homeFeed.factPeakLabel,
      big: formatCompactNumber(facts.peak.peak, locale),
      text: L.homeFeed.factPeak(facts.peak.streamerName),
      href: `/streamer/${facts.peak.streamerId}`,
      highlight: false,
    });
  }
  if (facts.reliable) {
    cards.push({
      key: 'reliable',
      kickerClass: 'text-confidence-medium',
      label: L.homeFeed.factReliableLabel,
      big: `${facts.reliable.hits} / ${facts.reliable.total}`,
      text: L.homeFeed.factReliable(
        facts.reliable.streamerName,
        facts.reliable.hits,
        facts.reliable.total,
      ),
      href: `/streamer/${facts.reliable.streamerId}`,
      highlight: false,
    });
  }
  if (facts.pause) {
    cards.push({
      key: 'pause',
      kickerClass: 'text-accent-pink',
      label: L.homeFeed.factPauseLabel,
      big: formatUntilDate(facts.pause.until, locale),
      text: L.homeFeed.factPause(facts.pause.streamerName),
      href: `/streamer/${facts.pause.streamerId}`,
      highlight: false,
    });
  }

  if (cards.length < 2) return null;

  return (
    <section aria-label={L.homeFeed.quickFactsTitle}>
      <FeedSectionHeader title={L.homeFeed.quickFactsTitle} />
      <p className="-mt-2 mb-3 text-xs text-text-muted">{L.homeFeed.quickFactsSub}</p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const body = (
            <>
              <span
                className={`block font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${card.kickerClass}`}
              >
                {card.label}
              </span>
              <span className="mt-1.5 block text-2xl font-extrabold tabular-nums text-white">
                {card.big}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-text-secondary">
                {card.text}
              </span>
            </>
          );
          const cardClass = `block h-full rounded-xl border p-4 ${
            card.highlight
              ? 'border-accent-cyan/40 bg-background-elevated shadow-[0_0_16px_rgba(0,240,255,0.10)]'
              : 'border-border-default bg-background-elevated'
          }`;
          return (
            <li key={card.key}>
              {card.href ? (
                <Link
                  href={localeHref(locale, card.href)}
                  prefetch={false}
                  className={`${cardClass} transition-colors hover:border-accent-cyan/50`}
                >
                  {body}
                </Link>
              ) : (
                <div className={cardClass}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
