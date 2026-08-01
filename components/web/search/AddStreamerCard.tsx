'use client';

// External search result row with an Add control (visual sibling of
// SearchResultCard). Not wrapped in a Link — until the add succeeds there is
// no streamer page to link to; the "added" state links to it instead.

import Image from 'next/image';
import Link from 'next/link';
import { LiveBadge, PlatformBadge } from '../Badges';
import { InitialsAvatar } from '../InitialsAvatar';
import {
  ADD_STREAMER_COPY,
  type AddStreamerErrorInfo,
  type ExternalSearchResult,
} from '@/lib/web/streamerSearch';
import { sizedAvatarUrl } from '@/lib/format/image-size';
import type { AddedStreamer } from '@/hooks/useStreamerAdd';

interface Props {
  result: ExternalSearchResult;
  pending: boolean;
  added: AddedStreamer | null;
  error: AddStreamerErrorInfo | null;
  onAdd: (result: ExternalSearchResult) => void;
  /** Sign-in destination for session-expired errors. */
  signInHref: string;
}

export function AddStreamerCard({
  result,
  pending,
  added,
  error,
  onAdd,
  signInHref,
}: Props) {
  const C = ADD_STREAMER_COPY;
  return (
    <div className="rounded-xl border border-border-default bg-background-elevated p-4">
      <div className="flex items-center gap-3">
        {result.avatarUrl ? (
          <Image
            src={sizedAvatarUrl(result.avatarUrl, 64)}
            alt={result.displayName}
            width={64}
            height={64}
            unoptimized
            className="rounded-full border border-border-default shrink-0"
          />
        ) : (
          <InitialsAvatar name={result.displayName} size={64} className="shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="truncate text-lg font-semibold text-text-primary">
              {result.displayName}
            </span>
            {result.isLive && <LiveBadge />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <PlatformBadge platform={result.platform} />
            {result.gameName && (
              <span className="truncate text-xs text-text-muted">
                {result.gameName}
              </span>
            )}
          </div>
        </div>

        {added ? (
          <Link
            href={`/streamer/${encodeURIComponent(added.id)}`}
            className="shrink-0 text-sm font-semibold text-accent-cyan hover:underline"
          >
            <span className="mr-1.5 text-accent-pink" aria-hidden="true">
              ♥
            </span>
            {C.addedLabel} · {C.viewSchedule}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onAdd(result)}
            disabled={pending}
            aria-busy={pending}
            className={`shrink-0 inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors ${
              pending
                ? 'cursor-wait border-border-default bg-background text-text-muted'
                : 'border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20'
            }`}
          >
            {pending ? (
              <>
                <span
                  aria-hidden="true"
                  className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-text-muted border-t-transparent"
                />
                {C.addPending}
              </>
            ) : (
              <>+ {C.addButton}</>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-accent-pink" role="alert">
          {error.message}{' '}
          {error.signIn && (
            <Link href={signInHref} className="font-semibold underline">
              {C.signInAgain}
            </Link>
          )}
          {error.retryable && !pending && (
            <button
              type="button"
              onClick={() => onAdd(result)}
              className="ml-1 font-semibold text-accent-cyan underline"
            >
              {C.tryAgain}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
