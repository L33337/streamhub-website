import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AUTH_ENABLED, EMAIL_AUTH_ENABLED, safeNextPath } from '@/lib/auth-flag';
import { TWITCH_IMPORT_SCOPES } from '@/lib/twitch-scopes';
import { EmailLoginForm } from '@/components/web/auth/EmailLoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in | Streamer Times',
  description:
    'Sign in to Streamer Times to sync your favorite streamers across web and the mobile app.',
  robots: { index: false, follow: true },
};

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

function callbackUrl(formData: FormData): string {
  // Post-login destination survives the OAuth round-trip via the callback's
  // ?next= param; re-sanitized here because the hidden field is client-editable.
  const next = safeNextPath(formData.get('next')?.toString());
  return `${siteUrl()}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;
}

async function signInWithTwitch(formData: FormData) {
  'use server';
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'twitch',
    // user:read:follows makes the provider token usable for the follows
    // import (Settings + onboarding) — without it Twitch's /channels/followed
    // returns 401 and the import silently loads zero follows.
    options: { redirectTo: callbackUrl(formData), scopes: TWITCH_IMPORT_SCOPES },
  });
  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(data.url);
}

async function signInWithGoogle(formData: FormData) {
  'use server';
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl(formData) },
  });
  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(data.url);
}

interface Props {
  searchParams: Promise<{ error?: string; next?: string }>;
}

// Known error codes get friendly copy; anything else (e.g. raw provider
// messages from the OAuth callback) falls back to the generic line.
const ERROR_COPY: Record<string, string> = {
  confirm_failed:
    'That confirmation link is invalid or has expired. Sign in below — if your email is still unconfirmed, we can send you a new link.',
};

export default async function LoginPage({ searchParams }: Props) {
  // Sign-in UI is hidden while the auth feature is dormant — activate via
  // NEXT_PUBLIC_AUTH_ENABLED=true (see lib/auth-flag.ts).
  if (!AUTH_ENABLED) {
    redirect('/app');
  }

  const { error, next: rawNext } = await searchParams;
  const next = safeNextPath(rawNext);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next ?? '/');

  return (
    <main className="container mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold text-white">Sign in to Streamer Times</h1>
      <p className="mt-3 text-text-secondary">
        Sync your favorite streamers across web and the mobile app.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-accent-pink/40 bg-accent-pink/10 px-3 py-2 text-sm text-accent-pink"
        >
          {ERROR_COPY[error] ??
            `Sign-in failed: ${decodeURIComponent(error ?? '')}. Please try again.`}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <form action={signInWithTwitch}>
          {next && <input type="hidden" name="next" value={next} />}
          <button
            type="submit"
            className="flex w-full h-12 items-center justify-center gap-3 rounded-lg bg-twitch px-4 text-sm font-bold tracking-wide text-white shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:bg-[#A266FF] transition-colors"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-current"
            >
              <path d="M4.265 0L1.602 5.323v17.073h6.387V24h2.665l2.66-2.604h4.789L24 16.41V0H4.265zm17.07 15.347l-3.197 3.196h-5.32l-2.66 2.604v-2.604H4.797V2.13h16.538v13.217zm-5.852-9.087h-2.13v6.385h2.13V6.26zm-5.853 0H7.5v6.385h2.13V6.26z" />
            </svg>
            Continue with Twitch
          </button>
        </form>

        <form action={signInWithGoogle}>
          {next && <input type="hidden" name="next" value={next} />}
          <button
            type="submit"
            className="flex w-full h-12 items-center justify-center gap-3 rounded-lg border border-border-default bg-background-elevated px-4 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </form>
      </div>

      {EMAIL_AUTH_ENABLED && (
        <>
          <div className="mt-8 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-divider" />
            <span className="text-xs uppercase tracking-wide text-text-muted">
              or with email
            </span>
            <div className="h-px flex-1 bg-divider" />
          </div>

          <div className="mt-6">
            <EmailLoginForm next={next} />
          </div>
        </>
      )}

      <p className="mt-8 text-xs text-text-muted">
        By signing in you agree to our{' '}
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
