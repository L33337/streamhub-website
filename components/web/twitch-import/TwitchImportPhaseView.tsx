'use client';

// Presentational body of the Twitch-follows import (fetching / selecting /
// importing / done / error). Footers (Cancel/Import/Continue buttons) stay
// with the callers — the Settings modal and the onboarding wizard need
// different actions around the same content.

import Image from 'next/image';
import { initialsFromName } from '../InitialsAvatar';
import type { TwitchImportState } from './useTwitchImport';
import { sizedAvatarUrl } from '@/lib/format/image-size';

interface Props {
  state: TwitchImportState;
}

export function TwitchImportPhaseView({ state }: Props) {
  const {
    phase,
    follows,
    selected,
    newSelectedCount,
    errorMessage,
    summary,
    toggleFollow,
    selectAll,
    selectNone,
  } = state;

  if (phase === 'fetching') {
    return (
      <p className="mt-4 text-sm text-text-secondary">
        Loading your follows from Twitch…
      </p>
    );
  }

  if (phase === 'selecting') {
    return (
      <>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-text-secondary">
            {follows.length} follow{follows.length === 1 ? '' : 's'} loaded.{' '}
            <span className="text-text-muted">
              {selected.size} selected ({newSelectedCount} new)
            </span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs underline underline-offset-4 text-accent-cyan hover:text-text-primary"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="text-xs underline underline-offset-4 text-text-muted hover:text-text-primary"
            >
              Select none
            </button>
          </div>
        </div>
        <ul className="mt-3 flex-1 min-h-0 overflow-y-auto rounded-lg border border-border-default divide-y divide-divider">
          {follows.length === 0 ? (
            <li className="px-3 py-4 text-sm text-text-muted">
              No eligible follows found.
            </li>
          ) : (
            follows.map((f) => {
              const isChecked = selected.has(f.twitchId);
              return (
                <li key={f.twitchId}>
                  <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-background-highlight">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => toggleFollow(f.twitchId, e.target.checked)}
                      className="h-4 w-4 accent-accent-cyan"
                    />
                    {f.avatarUrl ? (
                      <Image
                        src={sizedAvatarUrl(f.avatarUrl, 32)}
                        alt=""
                        width={32}
                        height={32}
                        unoptimized
                        className="rounded-full border border-border-default"
                      />
                    ) : (
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-accent-cyan/40 bg-background-highlight text-xs font-bold text-text-primary"
                        aria-hidden="true"
                      >
                        {initialsFromName(f.displayName)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                      {f.displayName}
                    </span>
                    {!f.existsInDb && (
                      <span className="rounded-full border border-accent-pink/40 bg-accent-pink/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-pink">
                        New
                      </span>
                    )}
                  </label>
                </li>
              );
            })
          )}
        </ul>
      </>
    );
  }

  if (phase === 'importing') {
    return (
      <p className="mt-4 text-sm text-text-secondary">
        Importing {selected.size} streamer
        {selected.size === 1 ? '' : 's'}
        {newSelectedCount > 0
          ? ` (${newSelectedCount} new, this can take a moment)…`
          : '…'}
      </p>
    );
  }

  if (phase === 'done' && summary) {
    return (
      <div className="mt-4 space-y-2 text-sm">
        <p className="text-text-primary font-semibold">Import complete.</p>
        <p className="text-text-secondary">
          {summary.existingFavorited} added from existing streamers,{' '}
          {summary.newStreamersCreated} new streamer
          {summary.newStreamersCreated === 1 ? '' : 's'} created.
        </p>
        {summary.errors.length > 0 && (
          <details className="text-xs text-text-muted">
            <summary className="cursor-pointer">
              {summary.errors.length} issue
              {summary.errors.length === 1 ? '' : 's'}
            </summary>
            <ul className="mt-1 list-disc pl-5">
              {summary.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    );
  }

  if (phase === 'error' && errorMessage) {
    return (
      <div
        role="alert"
        className="mt-4 rounded-lg border border-accent-pink/40 bg-accent-pink/10 px-3 py-2 text-sm text-accent-pink"
      >
        {errorMessage}
      </div>
    );
  }

  return null;
}
