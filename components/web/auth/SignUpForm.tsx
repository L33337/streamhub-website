'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { resolveSiteUrl, signupEmailRedirectTo } from '@/lib/auth-email';
import { friendlyAuthError } from '@/lib/auth-errors';
import { HCaptchaField, type HCaptchaFieldHandle } from './HCaptchaField';
import {
  AUTH_ERROR_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_SUBMIT_CLASS,
  AUTH_SUCCESS_CLASS,
} from './formStyles';

// Mirrors the Supabase project's minimum_password_length.
const MIN_PASSWORD_LENGTH = 6;
const RESEND_COOLDOWN_MS = 60_000;

interface Props {
  /** Sanitized post-signup destination (survives via the confirm link's flow). */
  next: string | null;
}

type Panel = 'form' | 'sent' | 'exists';

export function SignUpForm({ next }: Props) {
  const captchaRef = useRef<HCaptchaFieldHandle>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('form');
  const [resendReadyAt, setResendReadyAt] = useState(0);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const captchaToken = await captchaRef.current?.execute();
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          ...(captchaToken ? { captchaToken } : {}),
          emailRedirectTo: signupEmailRedirectTo(resolveSiteUrl()),
        },
      });
      if (signUpError) {
        setError(friendlyAuthError(signUpError));
        return;
      }
      // Anti-enumeration: for an already-registered confirmed email, Supabase
      // returns a fake user with an empty identities array and sends no mail.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        setPanel('exists');
        return;
      }
      if (data.session) {
        // Auto-confirm is on (local dev) — the user is already signed in.
        // Fresh signups land on the onboarding wizard, mirroring the
        // confirmed-email path (lib/auth-email.ts confirmResultRedirect).
        window.location.assign(next ?? '/onboarding');
        return;
      }
      setPanel('sent');
      setResendReadyAt(Date.now() + RESEND_COOLDOWN_MS);
    } catch {
      setError('Captcha was cancelled or failed — please try again.');
    } finally {
      captchaRef.current?.reset();
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (submitting || Date.now() < resendReadyAt) return;
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
        setResendReadyAt(Date.now() + RESEND_COOLDOWN_MS);
      }
    } catch {
      setError('Captcha was cancelled or failed — please try again.');
    } finally {
      captchaRef.current?.reset();
      setSubmitting(false);
    }
  }

  if (panel === 'exists') {
    return (
      <div>
        <div role="alert" className={AUTH_ERROR_CLASS}>
          An account with this email already exists.
        </div>
        <p className="mt-4 text-sm text-text-secondary">
          <Link href="/auth/login" className={`text-accent-cyan ${AUTH_LINK_CLASS}`}>
            Sign in
          </Link>{' '}
          instead, or{' '}
          <Link href="/auth/forgot-password" className={`text-accent-cyan ${AUTH_LINK_CLASS}`}>
            reset your password
          </Link>{' '}
          if you have forgotten it.
        </p>
      </div>
    );
  }

  if (panel === 'sent') {
    return (
      <div>
        <div className={AUTH_SUCCESS_CLASS}>
          <p className="font-semibold">Check your email</p>
          <p className="mt-1">
            We sent a confirmation link to <span className="font-medium">{email}</span>. Open it on
            any device to finish creating your account.
          </p>
        </div>
        {error && (
          <div role="alert" className={`mt-4 ${AUTH_ERROR_CLASS}`}>
            {error}
          </div>
        )}
        <p className="mt-4 text-sm text-text-secondary">
          No email after a few minutes? Check your spam folder, or{' '}
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={submitting}
            className={`text-accent-cyan ${AUTH_LINK_CLASS} disabled:opacity-50`}
          >
            {resent ? 'send it again' : 'resend it'}
          </button>
          .
        </p>
        <HCaptchaField ref={captchaRef} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div role="alert" className={`mb-4 ${AUTH_ERROR_CLASS}`}>
          {error}
        </div>
      )}

      <label htmlFor="signup-email" className={AUTH_LABEL_CLASS}>
        Email
      </label>
      <input
        id="signup-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={AUTH_INPUT_CLASS}
        placeholder="you@example.com"
      />

      <label htmlFor="signup-password" className={`mt-4 ${AUTH_LABEL_CLASS}`}>
        Password
      </label>
      <input
        id="signup-password"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={AUTH_INPUT_CLASS}
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
      />

      <button type="submit" disabled={submitting} className={`mt-5 ${AUTH_SUBMIT_CLASS}`}>
        {submitting ? 'Creating account…' : 'Create account'}
      </button>

      <p className="mt-4 text-sm text-text-secondary">
        Already have an account?{' '}
        <Link
          href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}
          className={`text-accent-cyan ${AUTH_LINK_CLASS}`}
        >
          Sign in
        </Link>
      </p>

      <HCaptchaField ref={captchaRef} />
    </form>
  );
}
