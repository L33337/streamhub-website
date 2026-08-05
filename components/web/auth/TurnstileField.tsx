'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

// Cloudflare Turnstile for the email-auth forms. The Supabase project enforces
// captcha on auth endpoints (same protection the mobile app uses), so
// signUp / signInWithPassword / resetPasswordForEmail need a token.
//
// Rendered explicitly with `execution: 'execute'` + `appearance: 'interaction-only'`:
// nothing is shown and no challenge runs until execute() is called on submit,
// and even then the widget only becomes visible for the small share of visitors
// Cloudflare cannot clear silently. That passive path is what hCaptcha gated
// behind a paid plan — it is the whole reason for this swap.
//
// When NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset (e.g. a local stack running
// without captcha), the field renders nothing and execute() resolves to null —
// callers then omit options.captchaToken entirely.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const ONLOAD_CALLBACK = 'onStreamerTimesTurnstileLoad';

interface TurnstileRenderParams {
  sitekey: string;
  execution?: 'render' | 'execute';
  appearance?: 'always' | 'execute' | 'interaction-only';
  theme?: 'auto' | 'light' | 'dark';
  retry?: 'auto' | 'never';
  'response-field'?: boolean;
  callback?: (token: string) => void;
  'error-callback'?: (code?: string) => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  'before-interactive-callback'?: () => void;
  'after-interactive-callback'?: () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, params: TurnstileRenderParams) => string;
  execute: (container: HTMLElement) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    [ONLOAD_CALLBACK]?: () => void;
  }
}

/**
 * Injects the Turnstile script once per document and resolves when the API is
 * ready. Cloudflare guarantees readiness via the `onload` param, not via the
 * script tag's load event, so the global callback is the reliable signal.
 */
let apiPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }

    window[ONLOAD_CALLBACK] = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error('Turnstile loaded without exposing its API'));
    };

    const script = document.createElement('script');
    script.src = `${SCRIPT_SRC}?render=explicit&onload=${ONLOAD_CALLBACK}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      // Let a later attempt retry instead of caching the failure forever.
      apiPromise = null;
      reject(new Error('Failed to load Turnstile'));
    };
    document.head.appendChild(script);
  });

  return apiPromise;
}

export interface TurnstileFieldHandle {
  /**
   * Runs the challenge and resolves the token (null when no sitekey is
   * configured). Rejects when the widget errors, times out, or the visitor
   * abandons an interactive challenge — callers surface that as a retryable
   * form error.
   */
  execute(): Promise<string | null>;
  /** Tokens are single-use — reset after EVERY auth call, success or failure. */
  reset(): void;
}

export const TurnstileField = forwardRef<TurnstileFieldHandle>(
  function TurnstileField(_props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<TurnstileApi | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const readyRef = useRef<Promise<void> | null>(null);
    const pendingRef = useRef<{
      resolve: (token: string) => void;
      reject: (reason: Error) => void;
    } | null>(null);
    const [interactive, setInteractive] = useState(false);

    // Resolve/reject exactly once per execute() — Turnstile can fire a success
    // callback after a timeout callback for the same attempt.
    const settle = useCallback((outcome: { token: string } | { error: Error }) => {
      const pending = pendingRef.current;
      if (!pending) return;
      pendingRef.current = null;
      if ('token' in outcome) pending.resolve(outcome.token);
      else pending.reject(outcome.error);
    }, []);

    useEffect(() => {
      if (!TURNSTILE_SITE_KEY) return;

      let cancelled = false;

      readyRef.current = loadTurnstile().then((api) => {
        if (cancelled || !containerRef.current) return;
        apiRef.current = api;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          execution: 'execute',
          appearance: 'interaction-only',
          theme: 'dark',
          // The form owns retrying (the visitor presses submit again); an
          // automatic retry would resolve into a token nobody is waiting for.
          retry: 'never',
          // No hidden <input> — the token goes to Supabase via JS, and a stray
          // field would be posted by the surrounding <form> on submit.
          'response-field': false,
          callback: (token) => {
            setInteractive(false);
            settle({ token });
          },
          'error-callback': (code) => {
            setInteractive(false);
            settle({ error: new Error(`Turnstile error${code ? `: ${code}` : ''}`) });
          },
          'timeout-callback': () => {
            setInteractive(false);
            settle({ error: new Error('Turnstile challenge timed out') });
          },
          'expired-callback': () => {
            settle({ error: new Error('Turnstile token expired') });
          },
          'before-interactive-callback': () => {
            setInteractive(true);
            containerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          },
          'after-interactive-callback': () => setInteractive(false),
        });
      });

      return () => {
        cancelled = true;
        settle({ error: new Error('Turnstile widget unmounted') });
        if (apiRef.current && widgetIdRef.current) {
          apiRef.current.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [settle]);

    useImperativeHandle(ref, () => ({
      async execute() {
        if (!TURNSTILE_SITE_KEY) return null;
        await readyRef.current;
        const api = apiRef.current;
        const container = containerRef.current;
        if (!api || !container || !widgetIdRef.current) {
          throw new Error('Turnstile is not ready');
        }
        // A previous attempt may still hold a token; start from a clean slate
        // so `callback` always describes THIS execute().
        api.reset(widgetIdRef.current);
        return new Promise<string>((resolve, reject) => {
          pendingRef.current = { resolve, reject };
          api.execute(container);
        });
      },
      reset() {
        if (apiRef.current && widgetIdRef.current) apiRef.current.reset(widgetIdRef.current);
        setInteractive(false);
      },
    }));

    if (!TURNSTILE_SITE_KEY) return null;

    return (
      <>
        <div ref={containerRef} className="mt-4 flex justify-center empty:mt-0" />
        {interactive && (
          <p className="mt-2 text-center text-sm text-text-secondary">
            Please complete the security check to continue.
          </p>
        )}
        {/* Required disclosure when the widget stays hidden for most visitors */}
        <p className="mt-4 text-[11px] leading-relaxed text-text-muted">
          This site is protected by Cloudflare Turnstile and its{' '}
          <a
            href="https://www.cloudflare.com/privacypolicy/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-text-primary"
          >
            Privacy Policy
          </a>{' '}
          and{' '}
          <a
            href="https://www.cloudflare.com/website-terms/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-text-primary"
          >
            Terms of Use
          </a>{' '}
          apply.
        </p>
      </>
    );
  },
);
