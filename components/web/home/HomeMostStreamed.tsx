import Image from 'next/image';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import type { MostStreamedEntry } from '@/lib/server/most-streamed';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { formatCompactNumber } from '@/lib/format/number';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';

/**
 * "Most streamed this week" (homepage, 2026-07-27): featured streamers by
 * hours live over the last 7 days (session-deduped — see
 * lib/server/most-streamed.ts). Sits next to HomeRisers in a duo grid.
 */
export function HomeMostStreamed({
  entries,
  locale = 'en',
}: {
  entries: MostStreamedEntry[];
  locale?: UiLang;
}) {
  const rows = entries.slice(0, 3);
  if (rows.length === 0) return null;
  const L = hubLexFor(locale);

  return (
    <section aria-label={L.homeFeed.mostStreamedTitle}>
      <FeedSectionHeader
        title={L.homeFeed.mostStreamedTitle}
        actionLabel={L.rankings.seeFullRanking}
        actionHref={localeHref(locale, '/rankings/most-active')}
      />
      <ul className="grid gap-2">
        {rows.map((entry, index) => (
          <li key={entry.streamerId} className="min-w-0">
            <Link
              href={localeHref(locale, `/streamer/${entry.streamerId}`)}
              prefetch={false}
              className="flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated px-4 py-3 transition-colors hover:border-accent-cyan/50"
            >
              <span className="w-6 shrink-0 font-mono text-sm text-text-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
              {entry.avatarUrl ? (
                <Image
                  src={entry.avatarUrl}
                  alt={entry.name}
                  width={32}
                  height={32}
                  unoptimized
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <InitialsAvatar name={entry.name} size={32} />
              )}
              <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
                <span className="truncate text-sm font-bold text-white sm:flex-1">
                  {entry.name}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-accent-cyan sm:shrink-0">
                  <Clock size={13} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">
                    {L.homeFeed.weekHours(
                      formatCompactNumber(Math.round(entry.hours), locale),
                    )}
                  </span>
                </span>
              </span>
              <span className="hidden shrink-0 font-mono text-xs text-text-muted sm:inline">
                {L.homeFeed.weekStreams(entry.sessions)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
