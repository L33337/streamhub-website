'use client';

import { useActionState } from 'react';
import { submitAccessRequest, type AccessRequestState } from '../actions';

const INITIAL: AccessRequestState = { status: 'idle' };
const FALLBACK_EMAIL = 'streamertimes@icloud.com';

/**
 * Request-API-Access form for the developer portal (Story 11).
 *
 * Uses React 19's `useActionState` to call the `submitAccessRequest` Server
 * Action. Renders inline field-level errors, a success state, and a graceful
 * mailto fallback when the email service isn't configured / fails.
 *
 * The form includes a CSS-hidden honeypot field (`website`) to catch the
 * dumbest spam bots. Real bots that fill all fields still get through —
 * we'd add rate limiting + Cloudflare later if needed.
 */
export function RequestAccessForm() {
  const [state, formAction, pending] = useActionState(
    submitAccessRequest,
    INITIAL
  );

  if (state.status === 'success') {
    return (
      <div className="rounded-lg border border-accent-cyan/40 bg-background-elevated p-6">
        <h3 className="text-lg font-semibold text-accent-cyan">Request received</h3>
        <p className="mt-2 text-text-secondary">
          Thanks — we&apos;ve forwarded your request to our partnerships team.
          You&apos;ll hear back within 2 business days. If you don&apos;t,
          email us directly at{' '}
          <a className="underline" href={`mailto:${FALLBACK_EMAIL}`}>
            {FALLBACK_EMAIL}
          </a>
          .
        </p>
      </div>
    );
  }

  const fieldErrors =
    state.status === 'error' ? state.fieldErrors ?? {} : {};
  const generalError =
    state.status === 'error' && !state.fieldErrors ? state.message : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {/* Honeypot — hidden from real users, must remain empty */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <label htmlFor="website">Website (leave empty)</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <Field
        id="name"
        label="Your name"
        required
        error={fieldErrors.name}
      >
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          className={inputClass(!!fieldErrors.name)}
        />
      </Field>

      <Field
        id="company"
        label="Company / Publisher"
        required
        error={fieldErrors.company}
      >
        <input
          id="company"
          name="company"
          type="text"
          autoComplete="organization"
          required
          minLength={2}
          maxLength={200}
          className={inputClass(!!fieldErrors.company)}
        />
      </Field>

      <Field
        id="email"
        label="Work email"
        required
        error={fieldErrors.email}
      >
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass(!!fieldErrors.email)}
        />
      </Field>

      <Field
        id="use_case"
        label="How would you use the Partner API?"
        hint="A short paragraph helps us route you to the right tier."
        required
        error={fieldErrors.use_case}
      >
        <textarea
          id="use_case"
          name="use_case"
          rows={4}
          required
          minLength={20}
          maxLength={1000}
          className={inputClass(!!fieldErrors.use_case)}
        />
      </Field>

      <Field
        id="tier_interest"
        label="Tier interest"
        required
        error={fieldErrors.tier_interest}
      >
        <select
          id="tier_interest"
          name="tier_interest"
          required
          defaultValue=""
          className={inputClass(!!fieldErrors.tier_interest)}
        >
          <option value="" disabled>
            Select a tier
          </option>
          <option value="bronze">Bronze — schedules + streamers</option>
          <option value="silver">Silver — predictions + analytics</option>
          <option value="gold">Gold — full data + realtime webhooks</option>
          <option value="unsure">Not sure yet</option>
        </select>
      </Field>

      {generalError && (
        <p className="text-sm text-accent-pink" role="alert">
          {generalError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent-cyan px-6 py-3 font-mono uppercase text-sm tracking-wider text-background hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
      >
        {pending ? 'Sending…' : 'Request API access'}
      </button>

      <p className="text-xs text-text-muted">
        Prefer email?{' '}
        <a className="underline" href={`mailto:${FALLBACK_EMAIL}`}>
          {FALLBACK_EMAIL}
        </a>
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1">
        {label}
        {required && <span className="text-accent-pink ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-text-muted mb-2">{hint}</p>}
      {children}
      {error && (
        <p className="mt-1 text-xs text-accent-pink" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return [
    'w-full rounded-lg border bg-background-elevated px-3 py-2 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-cyan',
    hasError ? 'border-accent-pink' : 'border-border-default',
  ].join(' ');
}
