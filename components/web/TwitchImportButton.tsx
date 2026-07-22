'use client';

// Settings entry point of the Twitch-follows import: trigger button + modal.
// The import state machine and phase UI live in components/web/twitch-import/
// (shared with the onboarding wizard at /onboarding).

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { connectTwitchForImport } from '@/lib/web/twitchConnect';
import { SettingsSection } from './SettingsSection';
import { TwitchImportPhaseView } from './twitch-import/TwitchImportPhaseView';
import {
  DAILY_NEW_LIMIT_HINT,
  useTwitchImport,
} from './twitch-import/useTwitchImport';

export function TwitchImportButton() {
  const state = useTwitchImport();
  const { hasToken, phase, selected, start, doImport, reset } = state;
  const pathname = usePathname();
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    if (phase === 'idle') return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && phase !== 'importing' && phase !== 'fetching') {
        reset();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, reset]);

  async function handleReconnect() {
    if (connecting) return;
    setConnecting(true);
    setConnectError(null);
    // On success the browser navigates to Twitch and returns here with a
    // fresh provider token captured by /auth/callback.
    const { error } = await connectTwitchForImport(pathname);
    if (error) {
      setConnectError(error);
      setConnecting(false);
    }
  }

  if (hasToken === null) {
    return (
      <SettingsSection title="Import Twitch follows">
        <p className="text-sm text-text-muted">Loading…</p>
      </SettingsSection>
    );
  }

  if (!hasToken) {
    return (
      <SettingsSection
        title="Import Twitch follows"
        description="Bring your Twitch follows over and favorite them in Streamer Times."
      >
        <p className="text-sm text-text-secondary">
          Your Twitch session has expired. Reconnect with Twitch to import your
          follows.
        </p>
        {connectError && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-accent-pink/40 bg-accent-pink/10 px-3 py-2 text-sm text-accent-pink"
          >
            {connectError}
          </div>
        )}
        <button
          type="button"
          onClick={() => void handleReconnect()}
          disabled={connecting}
          className="mt-3 inline-flex h-10 items-center rounded-lg bg-twitch px-4 text-sm font-bold tracking-wide text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:bg-[#A266FF] disabled:opacity-60 transition-colors"
        >
          {connecting ? 'Redirecting to Twitch…' : 'Reconnect with Twitch'}
        </button>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="Import Twitch follows"
      description={`Bring your Twitch follows over and favorite them. Up to ${DAILY_NEW_LIMIT_HINT} new streamers per day.`}
    >
      <button
        type="button"
        onClick={() => void start()}
        className="inline-flex h-10 items-center rounded-lg bg-twitch px-4 text-sm font-bold tracking-wide text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:bg-[#A266FF] transition-colors"
        aria-haspopup="dialog"
        aria-expanded={phase !== 'idle'}
      >
        Import follows
      </button>

      {phase !== 'idle' ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="twitch-import-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4 py-6"
          onClick={() => {
            if (phase !== 'importing' && phase !== 'fetching') reset();
          }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col gradient-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="twitch-import-title"
              className="text-xl font-bold text-white"
            >
              Import Twitch follows
            </h3>

            <TwitchImportPhaseView state={state} />

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {phase === 'selecting' && (
                <>
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex h-10 items-center rounded-lg border border-border-default bg-background-elevated px-4 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void doImport()}
                    disabled={selected.size === 0}
                    className="inline-flex h-10 items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/15 px-4 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Import {selected.size} streamer{selected.size === 1 ? '' : 's'}
                  </button>
                </>
              )}
              {phase === 'done' && (
                <>
                  <Link
                    href="/favorites"
                    className="inline-flex h-10 items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/15 px-4 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/25 transition-colors"
                  >
                    View favorites
                  </Link>
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex h-10 items-center rounded-lg border border-border-default bg-background-elevated px-4 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
              {phase === 'error' && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex h-10 items-center rounded-lg border border-border-default bg-background-elevated px-4 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </SettingsSection>
  );
}
