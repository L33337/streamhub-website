import Image from 'next/image';
import type { PublicStreamHistory } from '@/lib/server/partner-api';
import { formatDuration, formatTimeAgo } from '@/lib/format/time';
import { historyPlatforms, historyVodLinks } from '@/lib/history';
import { resolveUiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import { PlatformBadge } from './Badges';

function PlaceholderThumbnail({ name }: { name: string }) {
  const letter = (name?.trim()?.[0] ?? '?').toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-purple/40 to-accent-cyan/30 text-2xl font-bold text-white"
    >
      {letter}
    </div>
  );
}

const THUMB_SIZES =
  '(min-width: 1024px) 224px, (min-width: 768px) 176px, (min-width: 640px) 144px, 112px';

// Twitch returns this placeholder while a freshly-ended VOD's thumbnail is still being
// generated. The collector already stores it as null, but guard here too so a stale
// placeholder URL can never render as the grey 404 image — fall back to the avatar instead.
function usableThumbnail(url: string | null): string | null {
  if (!url || url.includes('/_404/404_processing')) return null;
  return url;
}

interface Props {
  stream: PublicStreamHistory;
  streamerName: string;
  avatarUrl: string | null;
  /** Streamer's broadcaster language — localizes the card copy (null → en). */
  language?: string | null;
}

/**
 * "Last stream" section for the streamer detail page — the streamer's most
 * recent finished broadcast (thumbnail, title, category, when it aired,
 * duration). Server-rendered: the relative-time label is computed once at
 * request time, so there is no client hydration of a drifting value.
 *
 * One card = one broadcast SESSION. A simulcast arrives from the API as a
 * single item carrying both platforms, so the card shows two badges and both
 * recordings rather than one arbitrary platform's copy of the same stream.
 *
 * Linking depends on how many recordings exist, because an anchor may not nest
 * inside another anchor: with at most one VOD the whole card is the link (the
 * big click target we want); with two, the card stays static and each platform
 * badge links to its own VOD.
 */
export function LastStreamCard({ stream, streamerName, avatarUrl, language = null }: Props) {
  const L = uiLexFor(language).lastStream;
  const title = stream.title?.trim() || L.pastStream;
  const aired = formatTimeAgo(stream.started_at, resolveUiLang(language));
  const duration =
    stream.duration_minutes != null ? formatDuration(stream.duration_minutes) : '';
  const meta = [aired, duration].filter(Boolean).join(' · ');
  const thumbnailUrl = usableThumbnail(stream.thumbnail_url);

  const platforms = historyPlatforms(stream);
  const vodLinks = historyVodLinks(stream);
  const perBadgeLinks = vodLinks.length > 1;
  const cardHref = perBadgeLinks ? null : (vodLinks[0]?.url ?? null);
  const hrefFor = (platform: (typeof platforms)[number]) =>
    perBadgeLinks ? vodLinks.find((v) => v.platform === platform)?.url : undefined;

  const card = (
    <article className="flex gap-3 rounded-xl bg-background-elevated p-3 gradient-border glow-cyan">
      <div className="relative aspect-[3/2] w-28 flex-shrink-0 overflow-hidden rounded-lg bg-background-highlight sm:w-36 md:w-44 lg:w-56">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            unoptimized
            sizes={THUMB_SIZES}
            className="object-cover"
          />
        ) : avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            fill
            unoptimized
            sizes={THUMB_SIZES}
            className="object-cover"
          />
        ) : (
          <PlaceholderThumbnail name={streamerName} />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="min-w-0">
          <span className="truncate text-xs text-text-secondary">{meta}</span>
          <h3
            className="mt-1 text-sm font-bold uppercase tracking-wide text-text-primary line-clamp-2"
            title={title}
          >
            {title}
          </h3>
          {stream.category ? (
            <p className="truncate text-xs text-text-secondary">{stream.category}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex flex-wrap items-center gap-1">
            {platforms.map((p) => (
              <PlatformBadge
                key={p}
                platform={p}
                size="sm"
                href={hrefFor(p)}
                language={language ?? 'en'}
              />
            ))}
          </div>
          {/* Only meaningful while the whole card is the link — with per-badge
              links the badges themselves are the call to action. */}
          {cardHref ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
              {L.watchVod}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );

  return (
    <section className="mt-6">
      <h2 className="text-2xl font-bold text-white mb-4">{L.heading}</h2>
      {cardHref ? (
        <a
          href={cardHref}
          target="_blank"
          rel="noopener noreferrer"
          className="block transition-transform hover:scale-[1.01] focus-visible:scale-[1.01] focus-visible:outline-none"
          aria-label={L.watchAria(streamerName, title)}
        >
          {card}
        </a>
      ) : (
        card
      )}
    </section>
  );
}
