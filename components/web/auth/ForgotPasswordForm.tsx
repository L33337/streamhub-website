'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { recoveryRedirectTo, resolveSiteUrl } from '@/lib/auth-email';
import { friendlyAuthError } from '@/lib/auth-errors';
import { TurnstileField, type TurnstileFieldHandle } from './TurnstileField';
import {
  AUTH_ERROR_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_SUBMIT_CLASS,
  AUTH_SUCCESS_CLASS,
} from './formStyles';

export function ForgotPasswordForm() {
  const captchaRef = useRef<TurnstileFieldHandle>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const captchaToken = await captchaRef.current?.execute();
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        ...(captchaToken ? { captchaToken } : {}),
        redirectTo: recoveryRedirectTo(resolveSiteUrl()),
      });
      // Supabase doesn't leak whether the address exists; real errors here are
      // captcha / rate-limit problems, which ARE worth surfacing.
      if (resetError) {
        setError(friendlyAuthError(resetError));
        return;
      }
      setSent(true);
    } catch {
      setError('Captcha was cancelled or failed — please try again.');
    } finally {
      captchaRef.current?.reset();
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div>
        <div className={AUTH_SUCCESS_CLASS}>
          <p className="font-semibold">Check your email</p>
          <p className="mt-1">
            If an account exists for <span className="font-medium">{email}</span>, a password-reset
            link is on its way. You can open it on any device.
          </p>
        </div>
        <p className="mt-4 text-sm text-text-secondary">
          <Link href="/auth/login" className={`text-accent-cyan ${AUTH_LINK_CLASS}`}>
            Back to sign in
          </Link>
        </p>
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

      <label htmlFor="forgot-email" className={AUTH_LABEL_CLASS}>
        Email
      </label>
      <input
        id="forgot-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={AUTH_INPUT_CLASS}
        placeholder="you@example.com"
      />

      <button type="submit" disabled={submitting} className={`mt-5 ${AUTH_SUBMIT_CLASS}`}>
        {submitting ? 'Sending…' : 'Send reset link'}
      </button>

      <p className="mt-4 text-sm text-text-secondary">
        <Link href="/auth/login" className={`text-accent-cyan ${AUTH_LINK_CLASS}`}>
          Back to sign in
        </Link>
      </p>

      <TurnstileField ref={captchaRef} />
    </form>
  );
}
