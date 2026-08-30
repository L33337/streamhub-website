'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client-eager';
import { friendlyAuthError } from '@/lib/auth-errors';
import {
  AUTH_ERROR_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_SUBMIT_CLASS,
} from './formStyles';

// Mirrors the Supabase project's minimum_password_length.
const MIN_PASSWORD_LENGTH = 6;

// The visitor arrives here with a session established by the recovery link
// (/auth/confirm verifyOtp, or the /auth/callback ?code= fallback). updateUser
// runs under that session — no captcha involved.
export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(friendlyAuthError(updateError));
      setSubmitting(false);
      return;
    }
    // Hard navigation so the destination server-renders with the session.
    window.location.assign('/feed');
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div role="alert" className={`mb-4 ${AUTH_ERROR_CLASS}`}>
          {error}
        </div>
      )}

      <label htmlFor="reset-password" className={AUTH_LABEL_CLASS}>
        New password
      </label>
      <input
        id="reset-password"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={AUTH_INPUT_CLASS}
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
      />

      <label htmlFor="reset-password-confirm" className={`mt-4 ${AUTH_LABEL_CLASS}`}>
        Repeat new password
      </label>
      <input
        id="reset-password-confirm"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className={AUTH_INPUT_CLASS}
        placeholder="••••••••"
      />

      <button type="submit" disabled={submitting} className={`mt-5 ${AUTH_SUBMIT_CLASS}`}>
        {submitting ? 'Saving…' : 'Set new password'}
      </button>

      <p className="mt-4 text-sm text-text-secondary">
        Link expired?{' '}
        <Link href="/auth/forgot-password" className={`text-accent-cyan ${AUTH_LINK_CLASS}`}>
          Request a new one
        </Link>
      </p>
    </form>
  );
}
