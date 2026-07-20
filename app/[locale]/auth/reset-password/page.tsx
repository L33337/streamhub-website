import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EMAIL_AUTH_ENABLED, emailAuthGateRedirect } from '@/lib/auth-flag';
import { ResetPasswordForm } from '@/components/web/auth/ResetPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Set new password | StreamerTimes',
  description: 'Choose a new password for your Streamer Times account.',
  robots: { index: false, follow: true },
};

export default async function ResetPasswordPage() {
  // Dormant while the email-auth sub-flag is off (see lib/auth-flag.ts).
  if (!EMAIL_AUTH_ENABLED) {
    redirect(emailAuthGateRedirect());
  }

  // A recovery link must have established a session first (/auth/confirm, or
  // the /auth/callback ?code= fallback). Without one there is nothing to
  // update — send the visitor back for a fresh link.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/forgot-password?error=session');

  return (
    <main className="container mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-white">Choose a new password</h1>
      <p className="mt-3 text-text-secondary">
        Set a new password for <span className="font-medium text-text-primary">{user.email}</span>.
      </p>

      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
