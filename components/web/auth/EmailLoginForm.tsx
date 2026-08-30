'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client-eager';
import { resolveSiteUrl, signupEmailRedirectTo } from '@/lib/auth-email';
import { friendlyAuthError, isEmailNotConfirmedError } from '@/lib/auth-errors';
import { TurnstileField, type TurnstileFieldHandle } from './TurnstileField';
import {
  AUTH_ERROR_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_SUBMIT_CLASS,
} from './formStyles';

interface Props {
  /** Sanitized post-login destination (from the login page's ?next= param). */
  next: string | null;
}

export function EmailLoginForm({ next }: Props) {
  const captchaRef = useRef<TurnstileFieldHandle>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setNeedsConfirmation(false);
    setResent(false);

    try {
      const captchaToken = await captchaRef.current?.execute();
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (signInError) {
        if (isEmailNotConfirmedError(signInError)) {
          setNeedsConfirmation(true);
        } else {
          setError(friendlyAuthError(signInError));
        }
        return;
      }
      // Hard navigation (same convention as sign-out): the destination gets a
      // clean server render that already sees the new sb-* session cookies.
      window.location.assign(next ?? '/');
    } catch {
      setError('Captcha was cancelled or failed — please try again.');
    } finally {
      captchaRef.current?.reset();
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const captchaToken = await captchaRef.current?.execute();
      const supabase = createSupabaseBrowserClient();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          ...(captchaToken ? { captchaToken } : {}),
          emailRedirectTo: signupEmailRedirectTo(resolveSiteUrl()),
        },
      });
      if (resendError) {
        setError(friendlyAuthError(resendError));
      } else {
        setResent(true);
      }
    } catch {
      setError('Captcha was cancelled or failed — please try again.');
    } finally {
      captchaRef.current?.reset();
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate={false}>
      {error && (
        <div role="alert" className={`mb-4 ${AUTH_ERROR_CLASS}`}>
          {error}
        </div>
      )}

      {needsConfirmation && (
        <div role="alert" className={`mb-4 ${AUTH_ERROR_CLASS}`}>
          Your email address is not confirmed yet.{' '}
          {resent ? (
            <span className="font-semibold">Confirmation email sent — check your inbox.</span>
          ) : (
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={submitting}
              className="font-semibold underline underline-offset-2 disabled:opacity-50"
            >
              Resend confirmation email
            </button>
          )}
        </div>
      )}

      <label htmlFor="login-email" className={AUTH_LABEL_CLASS}>
        Email
      </label>
      <input
        id="login-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={AUTH_INPUT_CLASS}
        placeholder="you@example.com"
      />

      <div className="mt-4 flex items-baseline justify-between">
        <label htmlFor="login-password" className={AUTH_LABEL_CLASS}>
          Password
        </label>
        <Link href="/auth/forgot-password" className={`text-xs text-text-muted ${AUTH_LINK_CLASS}`}>
          Forgot password?
        </Link>
      </div>
      <input
        id="login-password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={AUTH_INPUT_CLASS}
        placeholder="••••••••"
      />

      <button type="submit" disabled={submitting} className={`mt-5 ${AUTH_SUBMIT_CLASS}`}>
        {submitting ? 'Signing in…' : 'Sign in with email'}
      </button>

      <p className="mt-4 text-sm text-text-secondary">
        New to Streamer Times?{' '}
        <Link
          href={`/auth/sign-up${next ? `?next=${encodeURIComponent(next)}` : ''}`}
          className={`text-accent-cyan ${AUTH_LINK_CLASS}`}
        >
          Create an account
        </Link>
      </p>

      <TurnstileField ref={captchaRef} />
    </form>
  );
}
