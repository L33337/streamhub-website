import type { PublicStreamHistory } from '@/lib/server/partner-api';
import { formatDuration, formatTimeAgo, formatUtcDateShort } from '@/lib/format/time';
import { historyPlatforms, historyVodLinks } from '@/lib/history';
import { resolveUiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import { PlatformBadge } from './Badges';

interface Props {
  /** Finished broadcasts, newest first — already excludes the LastStreamCard item. */
  streams: PublicStreamHistory[];
  /** Request-time clock so the relative labels match the page's other timestamps. */
  now: Date;
  /** Streamer's broadcaster language — localizes the section copy (null → en). */
  language?: string | null;
}

/**
 * "Recent streams" list for the streamer detail page: the broadcasts before the
 * most recent one (that one has its own LastStreamCard). Compact text rows, no
 * thumbnails — the value is the crawlable date/title/category/duration record,
 * which keeps answering "what has {name} streamed lately?" even on pages with
 * nothing scheduled. Server-rendered from props; the parent guards against an
 * empty list.
 *
 * One row = one broadcast SESSION: a simulcast arrives as a single item with
 * both platforms, so the same stream no longer appears twice under two badges.
 * When a session has a recording on both platforms the badges become the VOD
 * links (one each); a single recording keeps the plain "VOD →" link.
 */
export function RecentStreamsSection({ streams, now, language = null }: Props) {
  if (streams.length === 0) return null;
  const lang = resolveUiLang(language);
  const L = uiLexFor(language);

  return (
    <section className="mt-10" aria-labelledby="recent-streams-heading">
      <h2 id="recent-streams-heading" className="text-2xl font-bold text-white mb-4">
        {L.recent.heading}
      </h2>
      <ul className="grid gap-2">
        {streams.map((s) => {
          const title = s.title?.trim() || L.lastStream.pastStream;
          const duration =
            s.duration_minutes != null ? formatDuration(s.duration_minutes) : '';
          const platforms = historyPlatforms(s);
          const vodLinks = historyVodLinks(s);
          const perBadgeLinks = vodLinks.length > 1;
          return (
            <li
              key={s.id}
              className="flex items-baseline gap-3 rounded-xl border border-border-default bg-background-elevated px-3 py-2"
            >
              <div className="w-28 shrink-0 text-xs text-text-muted sm:w-36">
                <time dateTime={s.started_at} className="block text-text-secondary">
                  {formatUtcDateShort(s.started_at, lang)}
                </time>
                {formatTimeAgo(s.started_at, lang, now)}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-semibold text-text-primary"
                  title={title}
                >
                  {title}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {[s.category, duration].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-center">
                <div className="flex items-center gap-1">
                  {platforms.map((p) => (
                    <PlatformBadge
                      key={p}
                      platform={p}
                      size="sm"
                      href={
                        perBadgeLinks
                          ? vodLinks.find((v) => v.platform === p)?.url
                          : undefined
                      }
                      language={language ?? 'en'}
                    />
                  ))}
                </div>
                {!perBadgeLinks && vodLinks[0] ? (
                  <a
                    href={vodLinks[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan hover:text-text-primary"
                    aria-label={L.recent.vodAria(title)}
                  >
                    VOD →
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
