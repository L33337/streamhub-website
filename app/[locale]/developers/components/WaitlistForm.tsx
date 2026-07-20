'use client';

import { useActionState } from 'react';
import { joinWaitlist, type WaitlistState } from '../actions';

const INITIAL: WaitlistState = { status: 'idle' };
const FALLBACK_EMAIL = 'streamertimes@icloud.com';

export function WaitlistForm() {
  const [state, formAction, pending] = useActionState(joinWaitlist, INITIAL);

  if (state.status === 'success') {
    return (
      <div className="rounded-lg border border-accent-cyan/40 bg-background-elevated p-6">
        <h3 className="text-lg font-semibold text-accent-cyan">
          You&apos;re on the list
        </h3>
        <p className="mt-2 text-text-secondary">
          Thanks — we&apos;ll email you the moment Partner API access opens.
          Want to share more about your use case? Reach us at{' '}
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
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px' }}
      >
        <label htmlFor="website">Website (leave empty)</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <Field id="email" label="Work email" required error={fieldErrors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@company.com"
          className={inputClass(!!fieldErrors.email)}
        />
      </Field>

      <Field
        id="name"
        label="Name"
        hint="Optional — helps us personalize the launch email."
        error={fieldErrors.name}
      >
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={100}
          className={inputClass(!!fieldErrors.name)}
        />
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
        {pending ? 'Sending…' : 'Join the waitlist'}
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
      <label
        htmlFor={id}
        className="block text-sm font-medium text-text-primary mb-1"
      >
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
