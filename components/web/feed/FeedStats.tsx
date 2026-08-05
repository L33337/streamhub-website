'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { sizedAvatarUrl, sizedCdnImageUrl } from '@/lib/format/image-size';
import { formatDurationMinutes } from '@/lib/rankings';
import { LocalBusiestDay, LocalPrimeTime } from '@/components/web/home/QuickFactLocal';
import {
  FEED_QUICK_FACTS_VISIBLE,
  countFeedQuickFacts,
  MIN_FEED_QUICK_FACTS,
  type FeedQuickFacts,
} from '@/lib/feed/quick-facts';
import type { WeekLeaderboardEntry } from '@/lib/feed/types';
import { FeedSectionHeader } from './FeedSectionHeader';

/** Medal tints for the first three places — the /rankings table convention. */
const RANK_CLASS = [
  'text-[#FFD700]',
  'text-[#C0C0C0]',
  'text-[#CD7F32]',
] as const;

/**
 * "Who streamed most this week" — the viewer's favorites ranked against each
 * other by hours live over the last 7 days.
 *
 * Hidden below two entries (enforced in buildWeekLeaderboard): a leaderboard of
 * one is a fact about a single streamer, and the feed has better cards for that.
 */
export function FeedWeekLeaderboard({
  entries,
  avatarMap,
}: {
  entries: WeekLeaderboardEntry[];
  avatarMap: Record<string, string>;
}) {
  if (entries.length === 0) return null;

  return (
    <section data-feed-section="stats" aria-label="Who streamed most this week">
      <FeedSectionHeader title="Who streamed most this week" />
      <ol className="rounded-xl border border-border-default bg-background-elevated">
        {entries.map((entry, index) => {
          const avatar = sizedAvatarUrl(avatarMap[entry.streamerId] ?? null, 40);
          const hours = entry.hours >= 10 ? Math.round(entry.hours) : Math.round(entry.hours * 10) / 10;
          const meta = [
            `${hours} h live`,
            `${entry.sessions} ${entry.sessions === 1 ? 'stream' : 'streams'}`,
            entry.topCategory,
          ].filter(Boolean) as string[];

          return (
            <li key={entry.streamerId} className="border-b border-divider last:border-b-0">
              <Link
                href={`/streamer/${encodeURIComponent(entry.streamerId)}`}
                prefetch={false}
                className="flex min-h-11 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-background-highlight"
              >
                <span
                  className={`w-5 shrink-0 text-center text-base font-extrabold tabular-nums ${
                    RANK_CLASS[index] ?? 'text-text-muted'
                  }`}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                {avatar ? (
                  <Image
                    src={sizedCdnImageUrl(avatar, 40)}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <InitialsAvatar name={entry.name} size={40} className="shrink-0 border" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-primary">
                    {entry.name}
                  </span>
                  {/* One line, ellipsised — on a 320px screen the category is
                      the first thing that may go, and that is the right order. */}
                  <span className="block truncate text-xs text-text-muted">
                    {meta.join(' · ')}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

interface QuickFactCard {
  key: string;
  label: string;
  kickerClass: string;
  big: ReactNode;
  text: string;
  note?: string;
  href: string | null;
}

/**
 * "Your favorites in numbers" — the personalized sibling of the homepage's
 * Quick facts, over the viewer's favorites only (feed_quick_facts RPC).
 *
 * Two rules carried over from the homepage:
 *   * the section hides below MIN_FEED_QUICK_FACTS cards, so a lone stat never
 *     dangles under its own heading;
 *   * the two histogram cards are TIMEZONE-DEPENDENT, so their value is
 *     rendered by the LocalPrimeTime/LocalBusiestDay islands (UTC frame during
 *     SSR, viewer frame after hydration) and every such card carries a marker
 *     saying which frame it is in — a clock reading without one is unreadable
 *     across the swap.
 *
 * The label tables are passed in rather than built here: formatting must not
 * move to the client, or the browser's Intl output could disagree with the
 * server's (lib/home/quick-facts.ts, "the server ships the label table").
 */
export function FeedQuickFactsSection({
  facts,
  hourLabels,
  dayLabels,
}: {
  facts: FeedQuickFacts | null;
  hourLabels: string[];
  dayLabels: string[];
}) {
  if (!facts) return null;
  const pool: QuickFactCard[] = [];

  if (facts.marathon) {
    pool.push({
      key: 'marathon',
      label: 'Longest stream',
      kickerClass: 'text-accent-cyan',
      big: formatDurationMinutes(facts.marathon.minutes),
      text: `${facts.marathon.streamerName} had the longest session of your favorites this week.`,
      note: facts.marathon.category ?? undefined,
      href: `/streamer/${encodeURIComponent(facts.marathon.streamerId)}`,
    });
  }

  if (facts.histogram) {
    pool.push({
      key: 'prime-time',
      label: 'Prime time',
      kickerClass: 'text-viz-bright',
      big: <LocalPrimeTime cells={facts.histogram.cells} hourLabels={hourLabels} />,
      // Comparative, not superlative: over a handful of channels "more than at
      // any other hour" would be a claim about noise.
      text: "Most of your favorites' streams start around this time.",
      note: `Based on ${facts.histogram.total} streams · your local time`,
      href: null,
    });
    pool.push({
      key: 'busiest-day',
      label: 'Busiest day',
      kickerClass: 'text-viz-bright',
      big: <LocalBusiestDay cells={facts.histogram.cells} dayLabels={dayLabels} />,
      text: 'The weekday your favorites go live most often.',
      note: `Based on ${facts.histogram.total} streams · your local time`,
      href: null,
    });
  }

  if (facts.comeback) {
    pool.push({
      key: 'comeback',
      label: 'Comeback',
      kickerClass: 'text-delta-up',
      big: `${facts.comeback.gapDays} days`,
      text: `${facts.comeback.streamerName} is back after the longest break of your favorites.`,
      href: `/streamer/${encodeURIComponent(facts.comeback.streamerId)}`,
    });
  }

  if (facts.topCategory) {
    pool.push({
      key: 'top-category',
      label: 'Most streamed',
      kickerClass: 'text-accent-cyan',
      big: facts.topCategory.category,
      text: `${facts.topCategory.sessions} streams from ${facts.topCategory.streamers} of your favorites this week.`,
      href: null,
    });
  }

  // Mirrors countFeedQuickFacts (the histogram counts twice, and it pushes two
  // cards) — asserted here so the two can only ever disagree loudly.
  if (pool.length < MIN_FEED_QUICK_FACTS || countFeedQuickFacts(facts) < MIN_FEED_QUICK_FACTS) {
    return null;
  }

  const cards = pool.slice(0, FEED_QUICK_FACTS_VISIBLE);

  return (
    <section aria-label="Your favorites in numbers">
      <FeedSectionHeader title="Your favorites in numbers" />
      <p className="-mt-2 mb-3 text-xs text-text-muted">
        The last 7 days across the streamers you follow.
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const body = (
            <>
              <span
                className={`block font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${card.kickerClass}`}
              >
                {card.label}
              </span>
              {/* `break-words` because a category name is unbounded user data:
                  "Dungeons & Dragons" must wrap, not overflow the card. */}
              <span className="mt-1.5 block break-words text-2xl font-extrabold tabular-nums text-white">
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
          const cardClass =
            'block h-full rounded-xl border border-border-default bg-background-elevated p-4';
          return (
            <li key={card.key}>
              {card.href ? (
                <Link
                  href={card.href}
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
