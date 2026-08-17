import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EMAIL_AUTH_ENABLED, emailAuthGateRedirect, safeNextPath } from '@/lib/auth-flag';
import { SignUpForm } from '@/components/web/auth/SignUpForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Create account | Streamer Times',
  description:
    'Create a Streamer Times account to sync your favorite streamers across web and the mobile app.',
  robots: { index: false, follow: true },
};

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function SignUpPage({ searchParams }: Props) {
  // Dormant while the email-auth sub-flag is off — activate via
  // NEXT_PUBLIC_EMAIL_AUTH_ENABLED=true (see lib/auth-flag.ts).
  if (!EMAIL_AUTH_ENABLED) {
    redirect(emailAuthGateRedirect());
  }

  const { next: rawNext } = await searchParams;
  const next = safeNextPath(rawNext);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next ?? '/');

  return (
    <main className="container mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-white">Create your account</h1>
      <p className="mt-3 text-text-secondary">
        Track your favorite streamers and get a personalized feed — on the web and in the mobile
        app.
      </p>

      <div className="mt-8">
        <SignUpForm next={next} />
      </div>

      <p className="mt-8 text-xs text-text-muted">
        By creating an account you agree to our{' '}
        <Link href="/terms-of-service" className="underline underline-offset-4 hover:text-text-primary">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-text-primary">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
