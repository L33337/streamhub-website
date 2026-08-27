import type { ReactNode } from 'react';
import Link from 'next/link';
import type { HomeQuickFacts as HomeQuickFactsData } from '@/lib/server/quick-facts';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { formatCompactNumber, formatStatValue } from '@/lib/format/number';
import { formatDuration } from '@/lib/format/time';
import {
  hourLabels as buildHourLabels,
  weekdayLabels as buildWeekdayLabels,
  hourStamp,
  rotateFacts,
  MIN_QUICK_FACT_CARDS,
} from '@/lib/home/quick-facts';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import {
  LocalBestSlot,
  LocalBusiestDay,
  LocalPrimeTime,
  LocalTimeNote,
} from './QuickFactLocal';

interface FactCard {
  key: string;
  kickerClass: string;
  label: string;
  /** ReactNode, not string: the timezone-dependent values are client islands. */
  big: ReactNode;
  text: string;
  /** Optional third line — a category chip, a best slot, a timezone hint. */
  note?: ReactNode;
  /** Streamer/game page link — aggregates without a subject have none. */
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
 * "Quick facts" (homepage rebuild 2026-07-27, expanded 2026-08-01): the
 * anonymous siblings of the feed's info cards. The pool now holds eleven
 * candidates — prediction accuracy, weekly peak, M14 punctuality, next break,
 * marathon, comeback, prime time, busiest day, top category, competition level
 * and room to grow — of which four render, cycling forward by one per hour
 * (see rotateFacts: server-side only, so nothing can mismatch on hydration).
 *
 * Each fact is optional; the section hides below MIN_QUICK_FACT_CARDS so a
 * lonely stat never dangles. NOTE: page.tsx mirrors that rule for the
 * section-nav chip via countQuickFacts() — keep both reading the same list.
 */
export function HomeQuickFacts({
  facts,
  locale = 'en',
  now = new Date(),
}: {
  facts: HomeQuickFactsData;
  locale?: UiLang;
  /** Injectable for tests/screenshots; drives which four cards this hour shows. */
  now?: Date;
}) {
  const L = hubLexFor(locale);
  const dayLabels = buildWeekdayLabels(locale);
  const hourLabels = buildHourLabels(locale);
  const localNote = (
    <LocalTimeNote local={L.homeFeed.factLocalTimeNote} utc={L.homeFeed.factUtcNote} />
  );

  // Canonical pool order — the rotation offset is an index into THIS list, so
  // reordering it changes which cards a given hour yields (harmless, but keep
  // it stable so the cycle stays predictable while debugging).
  const pool: FactCard[] = [];

  if (facts.prediction) {
    pool.push({
      key: 'prediction',
      kickerClass: 'text-accent-cyan',
      label: L.homeFeed.factPredictionLabel,
      big: `${facts.prediction.pct} %`,
      text: L.homeFeed.factPrediction(facts.prediction.hits, facts.prediction.total),
      // The one aggregate WITH a subject page: the methodology page explains
      // exactly how this number is scored (2026-08-27).
      href: '/methodology/predictions',
      highlight: true,
    });
  }
  if (facts.marathon) {
    pool.push({
      key: 'marathon',
      kickerClass: 'text-accent-pink',
      label: L.homeFeed.factMarathonLabel,
      big: formatDuration(facts.marathon.minutes),
      text: L.homeFeed.factMarathon(facts.marathon.streamerName),
      // Category names are brands — shown raw, never translated.
      note: facts.marathon.category,
      href: `/streamer/${facts.marathon.streamerId}`,
      highlight: false,
    });
  }
  if (facts.comeback) {
    pool.push({
      key: 'comeback',
      kickerClass: 'text-live',
      label: L.homeFeed.factComebackLabel,
      big: `${facts.comeback.gapDays}`,
      text: L.homeFeed.factComeback(facts.comeback.streamerName, facts.comeback.gapDays),
      href: `/streamer/${facts.comeback.streamerId}`,
      highlight: false,
    });
  }
  if (facts.startHistogram) {
    const total = formatCompactNumber(facts.startHistogram.total, locale);
    pool.push({
      key: 'prime-time',
      kickerClass: 'text-accent-cyan',
      label: L.homeFeed.factPrimeTimeLabel,
      big: <LocalPrimeTime cells={facts.startHistogram.cells} hourLabels={hourLabels} />,
      text: L.homeFeed.factPrimeTime(total),
      note: localNote,
      href: null,
      highlight: false,
    });
    pool.push({
      key: 'busiest-day',
      kickerClass: 'text-confidence-medium',
      label: L.homeFeed.factBusiestDayLabel,
      big: <LocalBusiestDay cells={facts.startHistogram.cells} dayLabels={dayLabels} />,
      text: L.homeFeed.factBusiestDay(total),
      note: localNote,
      href: null,
      highlight: false,
    });
  }
  if (facts.topCategory) {
    pool.push({
      key: 'top-category',
      kickerClass: 'text-accent-cyan',
      label: L.homeFeed.factTopCategoryLabel,
      big: formatCompactNumber(facts.topCategory.sessions, locale),
      text: L.homeFeed.factTopCategory(
        facts.topCategory.category,
        facts.topCategory.streamers,
      ),
      href: facts.topCategoryLink?.hasHub ? `/game/${facts.topCategoryLink.slug}` : null,
      highlight: false,
    });
  }
  if (facts.competition) {
    pool.push({
      key: 'competition',
      kickerClass: 'text-live',
      label: L.homeFeed.factCompetitionLabel,
      big: formatStatValue(facts.competition.avgStreamers, locale),
      text: L.homeFeed.factCompetition(facts.competition.category),
      href: facts.competition.hasHub
        ? `/game/${facts.competition.slug}`
        : '/best-games-to-stream',
      highlight: false,
    });
  }
  if (facts.roomToGrow) {
    pool.push({
      key: 'room-to-grow',
      kickerClass: 'text-confidence-medium',
      label: L.homeFeed.factRoomLabel,
      big: formatStatValue(facts.roomToGrow.score, locale),
      text: L.homeFeed.factRoom(
        facts.roomToGrow.category,
        formatStatValue(facts.roomToGrow.avgStreamers, locale),
      ),
      note: facts.roomToGrow.bestSlot ? (
        <LocalBestSlot
          slot={facts.roomToGrow.bestSlot}
          label={L.homeFeed.factRoomSlotLabel}
          dayLabels={dayLabels}
          hourLabels={hourLabels}
          localNote={L.homeFeed.factLocalTimeNote}
          utcNote={L.homeFeed.factUtcNote}
        />
      ) : undefined,
      href: '/best-games-to-stream',
      highlight: false,
    });
  }
  if (facts.peak) {
    pool.push({
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
    pool.push({
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
    pool.push({
      key: 'pause',
      kickerClass: 'text-accent-pink',
      label: L.homeFeed.factPauseLabel,
      big: formatUntilDate(facts.pause.until, locale),
      text: L.homeFeed.factPause(facts.pause.streamerName),
      href: `/streamer/${facts.pause.streamerId}`,
      highlight: false,
    });
  }

  if (pool.length < MIN_QUICK_FACT_CARDS) return null;
  const cards = rotateFacts(pool, hourStamp(now));

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
              {card.note ? (
                <span className="mt-1 block text-[11px] text-text-muted">{card.note}</span>
              ) : null}
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
