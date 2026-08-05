import Image from 'next/image';
import Link from 'next/link';
import type { PublicStreamer } from '@/lib/server/partner-api';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { LiveBadge, PlatformBadge } from './Badges';
import { FavoriteButton } from './FavoriteButton';
import { InitialsAvatar } from './InitialsAvatar';
import { sizedAvatarUrl } from '@/lib/format/image-size';

export interface SearchResultStreamer extends PublicStreamer {
  is_live: boolean;
}

interface Props {
  streamer: SearchResultStreamer;
  compact?: boolean;
  /** M22 S4.1: keeps the streamer link in the viewer's locale tree and
   *  localizes the heart's labels; default 'en' keeps other callers byte-identical. */
  locale?: UiLang;
}

export function SearchResultCard({ streamer, compact = false, locale = 'en' }: Props) {
  const avatarSize = compact ? 40 : 64;
  return (
    <Link
      href={localeHref(locale, `/streamer/${encodeURIComponent(streamer.id)}`)}
      className={`group flex items-center gap-3 rounded-xl border border-border-default bg-background-elevated transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight ${
        compact ? 'px-3 py-2' : 'p-4'
      }`}
    >
      {streamer.avatar_url ? (
        <Image
          src={sizedAvatarUrl(streamer.avatar_url, avatarSize)}
          alt={streamer.name}
          width={avatarSize}
          height={avatarSize}
          unoptimized
          className="rounded-full border border-border-default shrink-0"
        />
      ) : (
        <InitialsAvatar name={streamer.name} size={avatarSize} className="shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        {/* min-w-0 twice, or the `truncate` below is decorative: neither the
            wrap row nor the span may keep its automatic min-width, otherwise a
            long unbroken streamer name inflates the card's minimum and pushes
            the grid track past the viewport on a 320px phone. */}
        <div className="flex min-w-0 items-center gap-2 flex-wrap">
          <span
            className={`min-w-0 font-semibold text-text-primary group-hover:text-accent-cyan transition-colors ${
              compact ? 'text-sm' : 'text-lg'
            } truncate`}
          >
            {streamer.name}
          </span>
          {streamer.is_live && <LiveBadge />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {streamer.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
          {streamer.is_always_on && (
            <span className="inline-flex items-center rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-accent-cyan">
              24/7
            </span>
          )}
        </div>
      </div>

      <FavoriteButton
        streamerId={streamer.id}
        streamerName={streamer.name}
        size="sm"
        className="shrink-0"
        language={locale}
      />
    </Link>
  );
}
