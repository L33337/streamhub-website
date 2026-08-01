import Image from 'next/image';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import type { PublicRankingEntry } from '@/lib/server/partner-api';
import { hubLexFor } from '@/lib/i18n-hub';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { formatCompactNumber } from '@/lib/format/number';
import { formatSignedCompact } from '@/lib/rankings';
import { FeedSectionHeader } from '@/components/web/feed/FeedSectionHeader';
import { InitialsAvatar } from '@/components/web/InitialsAvatar';
import { sizedAvatarUrl } from '@/lib/format/image-size';

/**
 * "Risers of the week" (homepage rebuild 2026-07-27): top of the
 * fastest-growing ranking. Hidden while the ranking is still warming up
 * (follower snapshots < 7 days old return no entries — expected until
 * ~2026-07-27).
 */
export function HomeRisers({
  entries,
  locale = 'en',
}: {
  entries: PublicRankingEntry[];
  locale?: UiLang;
}) {
  const rows = entries
    .filter((entry) => typeof entry.values.follower_gain_7d === 'number')
    .slice(0, 3);
  if (rows.length === 0) return null;
  const L = hubLexFor(locale);

  return (
    <section aria-label={L.homeFeed.risersTitle}>
      <FeedSectionHeader
        title={L.homeFeed.risersTitle}
        actionLabel={L.homeFeed.risersLink}
        actionHref={localeHref(locale, '/rankings/fastest-growing')}
      />
      {/* Same phone rule as HomeMostWatched: min-w-0 on every <li> (a grid
          item's min-width:auto would size the track to the widest row's
          max-content) and the value drops under the name below `sm`, where
          "+467.6K obserwujących w 7 dni" is wider than the whole row. */}
      <ul className="grid gap-2">
        {rows.map((entry) => (
          <li key={entry.streamer.id} className="min-w-0">
            <Link
              href={localeHref(locale, `/streamer/${entry.streamer.id}`)}
              prefetch={false}
              className="flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated px-4 py-3 transition-colors hover:border-accent-cyan/50"
            >
              <span className="w-6 shrink-0 font-mono text-sm text-text-muted">
                {String(entry.rank).padStart(2, '0')}
              </span>
              {entry.streamer.avatar_url ? (
                <Image
                  src={sizedAvatarUrl(entry.streamer.avatar_url, 32)}
                  alt={entry.streamer.name}
                  width={32}
                  height={32}
                  unoptimized
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <InitialsAvatar name={entry.streamer.name} size={32} />
              )}
              <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
                <span className="truncate text-sm font-bold text-white sm:flex-1">
                  {entry.streamer.name}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-live sm:shrink-0">
                  <TrendingUp size={13} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">
                    {L.homeFeed.risersGained(
                      formatSignedCompact(entry.values.follower_gain_7d),
                    )}
                  </span>
                </span>
              </span>
              {typeof entry.values.follower_count === 'number' && (
                <span className="hidden shrink-0 font-mono text-xs text-text-muted sm:inline">
                  {L.homeFeed.followers(
                    formatCompactNumber(entry.values.follower_count, locale),
                  )}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
