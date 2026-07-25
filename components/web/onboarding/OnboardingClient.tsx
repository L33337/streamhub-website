'use client';

// The onboarding wizard: choice → (import | pick) → done. Step state lives
// client-side but is mirrored into ?step= (history.replaceState) so a refresh
// — and the "Connect Twitch" OAuth round-trip, which returns to
// /onboarding?step=import — re-enters the right step.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { onboardingFinishTarget, type OnboardingStep } from '@/lib/onboarding';
import { startTwitchFollowImport } from '@/lib/web/twitchConnect';
import { connectErrorCopy } from '@/lib/web/twitchImportReturn';
import { TwitchImportPhaseView } from '../twitch-import/TwitchImportPhaseView';
import { useTwitchImport } from '../twitch-import/useTwitchImport';
import { OnboardingPickStep } from './OnboardingPickStep';
import type { OnboardingSuggestion } from './types';

const PRIMARY_BTN =
  'inline-flex h-11 items-center justify-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/15 px-5 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
const SECONDARY_BTN =
  'inline-flex h-11 items-center justify-center rounded-lg border border-border-default bg-background-elevated px-5 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors';
const TWITCH_BTN =
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-twitch px-5 text-sm font-bold tracking-wide text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:bg-[#A266FF] disabled:opacity-60 transition-colors';
const LINK_CLASS =
  'text-sm text-text-muted underline underline-offset-4 hover:text-text-primary transition-colors';

interface Props {
  initialStep: OnboardingStep;
  /** Sanitized post-onboarding destination (defaults to /feed). */
  nextPath: string | null;
  /** Provider error code from a declined "Connect Twitch" round-trip. */
  connectError: string | null;
  suggestions: OnboardingSuggestion[];
  /** Heading over the pick step's default grid ("Most followed" / fallback). */
  suggestionsLabel: string;
}

export function OnboardingClient({
  initialStep,
  nextPath,
  connectError,
  suggestions,
  suggestionsLabel,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { favorites } = useFavorites();
  const importState = useTwitchImport();
  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [connecting, setConnecting] = useState(false);
  const [connectFailure, setConnectFailure] = useState<string | null>(
    connectError ? connectErrorCopy(connectError) : null,
  );

  const finishTarget = onboardingFinishTarget(nextPath);

  function stepUrl(target: OnboardingStep): string {
    const params = new URLSearchParams();
    if (target !== 'choice') params.set('step', target);
    if (nextPath) params.set('next', nextPath);
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
  }

  function goTo(target: OnboardingStep) {
    setStep(target);
    window.history.replaceState(null, '', stepUrl(target));
  }

  // Entering the import step with a captured token loads the follows
  // immediately (mirrors the app, where Twitch sign-ins land directly on the
  // pre-filled import screen). reset() is always paired with leaving the
  // step, so idle-while-on-import only occurs on entry.
  const { hasToken, phase, start } = importState;
  useEffect(() => {
    if (step === 'import' && hasToken === true && phase === 'idle') {
      void start();
    }
  }, [step, hasToken, phase, start]);

  function handleConnectTwitch() {
    if (connecting) return;
    setConnecting(true);
    setConnectFailure(null);
    // Navigates to Twitch and returns into ?step=import via /auth/twitch-import,
    // which captures the fresh token. Only the pre-flight error case resolves.
    const { error } = startTwitchFollowImport(stepUrl('import'));
    if (error) {
      setConnectFailure(error);
      setConnecting(false);
    }
  }

  function finish() {
    router.push(finishTarget);
  }

  const stepNumber = step === 'choice' ? 1 : step === 'done' ? 3 : 2;

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-accent-cyan">
        Step {stepNumber} of 3
      </p>

      {step === 'choice' && (
        <section>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Welcome to Streamer Times!
          </h1>
          <p className="mt-3 text-text-secondary">
            Add your favorite streamers to get a personalized feed and never
            miss a stream. How do you want to start?
          </p>

          {connectFailure && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-accent-pink/40 bg-accent-pink/10 px-3 py-2 text-sm text-accent-pink"
            >
              {connectFailure}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => {
                if (importState.hasToken) goTo('import');
                else handleConnectTwitch();
              }}
              disabled={connecting}
              className="group rounded-xl border border-border-default bg-background-elevated p-5 text-left transition-colors hover:border-twitch/60 disabled:opacity-60"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-twitch/15 text-twitch">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    <path d="M4.265 0L1.602 5.323v17.073h6.387V24h2.665l2.66-2.604h4.789L24 16.41V0H4.265zm17.07 15.347l-3.197 3.196h-5.32l-2.66 2.604v-2.604H4.797V2.13h16.538v13.217zm-5.852-9.087h-2.13v6.385h2.13V6.26zm-5.853 0H7.5v6.385h2.13V6.26z" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-text-primary group-hover:text-white">
                    {connecting ? 'Redirecting to Twitch…' : 'Import your Twitch follows'}
                  </span>
                  <span className="mt-0.5 block text-sm text-text-secondary">
                    {importState.hasToken
                      ? 'Your Twitch connection is ready — bring your follows over in one go.'
                      : 'Connect your Twitch account and bring your follows over in one go.'}
                  </span>
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => goTo('pick')}
              className="group rounded-xl border border-border-default bg-background-elevated p-5 text-left transition-colors hover:border-accent-cyan/60"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-cyan/10 text-accent-cyan">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-text-primary group-hover:text-white">
                    Pick favorites manually
                  </span>
                  <span className="mt-0.5 block text-sm text-text-secondary">
                    Browse the most-followed streamers or search for the ones
                    you follow.
                  </span>
                </span>
              </span>
            </button>
          </div>

          <p className="mt-8">
            <button type="button" onClick={finish} className={LINK_CLASS}>
              Skip for now — you can add favorites any time
            </button>
          </p>
        </section>
      )}

      {step === 'import' && (
        <section>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Import your Twitch follows
          </h1>

          {importState.hasToken === false ? (
            <div>
              <p className="mt-3 text-text-secondary">
                Connect your Twitch account so we can load the channels you
                follow. You choose which ones to add before anything is saved.
              </p>
              {connectFailure && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-accent-pink/40 bg-accent-pink/10 px-3 py-2 text-sm text-accent-pink"
                >
                  {connectFailure}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleConnectTwitch()}
                  disabled={connecting}
                  className={TWITCH_BTN}
                >
                  {connecting ? 'Redirecting to Twitch…' : 'Connect Twitch'}
                </button>
                <button
                  type="button"
                  onClick={() => goTo('pick')}
                  className={SECONDARY_BTN}
                >
                  Pick manually instead
                </button>
              </div>
              <p className="mt-6">
                <button type="button" onClick={() => goTo('choice')} className={LINK_CLASS}>
                  Back
                </button>
              </p>
            </div>
          ) : (
            <div className="mt-1 flex max-h-[70vh] flex-col">
              <TwitchImportPhaseView state={importState} />

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {phase === 'selecting' && (
                  <>
                    <button
                      type="button"
                      onClick={() => void importState.doImport()}
                      disabled={importState.selected.size === 0}
                      className={PRIMARY_BTN}
                    >
                      Import {importState.selected.size} streamer
                      {importState.selected.size === 1 ? '' : 's'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        importState.reset();
                        goTo('choice');
                      }}
                      className={SECONDARY_BTN}
                    >
                      Back
                    </button>
                  </>
                )}
                {phase === 'done' && (
                  <>
                    <button type="button" onClick={() => goTo('done')} className={PRIMARY_BTN}>
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => goTo('pick')}
                      className={SECONDARY_BTN}
                    >
                      Add more manually
                    </button>
                  </>
                )}
                {phase === 'error' && (
                  <>
                    <button
                      type="button"
                      onClick={() => void importState.start()}
                      className={PRIMARY_BTN}
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={() => goTo('pick')}
                      className={SECONDARY_BTN}
                    >
                      Pick manually instead
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {phase !== 'importing' && phase !== 'done' && importState.hasToken !== false && (
            <p className="mt-6">
              <button type="button" onClick={finish} className={LINK_CLASS}>
                Skip for now
              </button>
            </p>
          )}
        </section>
      )}

      {step === 'pick' && (
        <OnboardingPickStep
          suggestions={suggestions}
          suggestionsLabel={suggestionsLabel}
          onContinue={() => goTo('done')}
          onBack={() => goTo('choice')}
        />
      )}

      {step === 'done' && (
        <section>
          <h1 className="mt-2 text-3xl font-bold text-white">
            You&apos;re all set!
          </h1>
          <p className="mt-3 text-text-secondary">
            {favorites.size > 0 ? (
              <>
                You&apos;re following{' '}
                <span className="font-semibold text-text-primary">
                  {favorites.size} streamer{favorites.size === 1 ? '' : 's'}
                </span>
                . Your feed shows their live streams, predicted schedules and
                highlights — and your favorites sync with the mobile app.
              </>
            ) : (
              <>
                You haven&apos;t added favorites yet — your feed shows popular
                streamers until you do. You can add favorites any time from
                search or a streamer page.
              </>
            )}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={finish} className={PRIMARY_BTN}>
              Go to your feed
            </button>
            <Link href="/feed/interests" className={SECONDARY_BTN}>
              Fine-tune your interests
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
