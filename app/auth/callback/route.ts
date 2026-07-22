import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AUTH_ENABLED, safeNextPath } from '@/lib/auth-flag';
import {
  isFreshSignup,
  isOnboardingPath,
  postAuthDestination,
} from '@/lib/onboarding';

export const dynamic = 'force-dynamic';

const TWITCH_TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

/** The provider token is only ever used for the follows import, so a token
 * without this scope is not worth capturing. */
const TWITCH_IMPORT_SCOPE = 'user:read:follows';

function escapeJsonForScript(value: string): string {
  // JSON.stringify already escapes quotes/backslashes/newlines, but `</script>`
  // and `<!--` can still break out of an inline <script>. Escape the slash to
  // neutralise both.
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function twitchTokenCaptureResponse(token: string, nextUrl: string): Response {
  const payload = JSON.stringify({
    token,
    expiresAt: Date.now() + TWITCH_TOKEN_TTL_MS,
  });
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Signing you in…</title><meta name="robots" content="noindex"></head><body><p>Signing you in…</p><script>
try { localStorage.setItem('twitchProviderToken', ${escapeJsonForScript(payload)}); } catch (e) {}
window.location.replace(${escapeJsonForScript(nextUrl)});
</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Whether the session's provider_token is a Twitch token usable for the
 * follows import. `session.provider_token` belongs to whichever provider was
 * used in THIS round-trip — for multi-identity accounts (e.g. Google user who
 * linked Twitch) app_metadata alone can't tell a Google token from a Twitch
 * one, so we ask Twitch. Returns null when indeterminate (network error), in
 * which case the caller falls back to the app_metadata.provider heuristic.
 */
async function isUsableTwitchToken(token: string): Promise<boolean | null> {
  try {
    const res = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const body: unknown = await res.json();
    const scopes =
      typeof body === 'object' && body !== null && Array.isArray((body as { scopes?: unknown }).scopes)
        ? ((body as { scopes: unknown[] }).scopes as string[])
        : [];
    return scopes.includes(TWITCH_IMPORT_SCOPE);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const providerError = url.searchParams.get('error');
  // Sanitized against open redirects — only same-site paths pass.
  const next = safeNextPath(url.searchParams.get('next'));

  if (providerError) {
    // A declined/failed "Connect Twitch" round-trip from the onboarding wizard
    // (user is already signed in there) returns to the wizard with an error
    // marker instead of the login page, which would bounce a signed-in user.
    if (next && isOnboardingPath(next)) {
      const back = new URL(next, url.origin);
      back.searchParams.set('connect_error', providerError);
      return NextResponse.redirect(back);
    }
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent(providerError)}`,
        url.origin,
      ),
    );
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data?.session?.user;
      const provider = user?.app_metadata?.provider as string | undefined;
      const providers = Array.isArray(user?.app_metadata?.providers)
        ? (user.app_metadata.providers as string[])
        : [];
      const providerToken = data?.session?.provider_token;

      // Capture the Twitch provider token for the follows import — both for
      // Twitch-first sign-ins and for accounts that just linked Twitch.
      let captureToken: string | null = null;
      if (
        typeof providerToken === 'string' &&
        providerToken.length > 0 &&
        (provider === 'twitch' || providers.includes('twitch'))
      ) {
        const usable = await isUsableTwitchToken(providerToken);
        // Indeterminate check: keep the pre-validation behavior (capture for
        // Twitch-first accounts, where the token is Twitch's with certainty).
        if (usable === true || (usable === null && provider === 'twitch')) {
          captureToken = providerToken;
        }
      }

      const dest = postAuthDestination({
        isNewUser: isFreshSignup(user?.created_at, Date.now()),
        next,
        hasTwitchToken: captureToken !== null,
        authEnabled: AUTH_ENABLED,
      });

      if (captureToken !== null) {
        return twitchTokenCaptureResponse(
          captureToken,
          new URL(dest, url.origin).toString(),
        );
      }
      return NextResponse.redirect(new URL(dest, url.origin));
    }
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent(error.message)}`,
        url.origin,
      ),
    );
  }

  return NextResponse.redirect(
    new URL('/auth/login?error=missing_code', url.origin),
  );
}
