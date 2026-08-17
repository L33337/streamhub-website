import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EMAIL_AUTH_ENABLED, emailAuthGateRedirect } from '@/lib/auth-flag';
import { ForgotPasswordForm } from '@/components/web/auth/ForgotPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Forgot password | Streamer Times',
  description: 'Request a password-reset link for your Streamer Times account.',
  robots: { index: false, follow: true },
};

// Error codes arriving via redirects from /auth/confirm (expired recovery
// link) and /auth/reset-password (no recovery session).
const ERROR_COPY: Record<string, string> = {
  link_expired: 'That reset link is invalid or has expired — request a new one below.',
  session: 'Your reset link has expired or was already used — request a new one below.',
};

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  // Dormant while the email-auth sub-flag is off (see lib/auth-flag.ts).
  if (!EMAIL_AUTH_ENABLED) {
    redirect(emailAuthGateRedirect());
  }

  const { error } = await searchParams;
  const errorCopy = error ? ERROR_COPY[error] : undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/settings');

  return (
    <main className="container mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-white">Forgot your password?</h1>

      {errorCopy && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-accent-pink/40 bg-accent-pink/10 px-3 py-2 text-sm text-accent-pink"
        >
          {errorCopy}
        </div>
      )}

      <p className="mt-3 text-text-secondary">
        Enter your email address and we&apos;ll send you a link to choose a new password.
      </p>
      <p className="mt-2 text-sm text-text-muted">
        Signed up with Twitch or Google? This also lets you add a password to that account.
      </p>

      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
