import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/auth-flag';

export const dynamic = 'force-dynamic';

const TWITCH_TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

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

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const providerError = url.searchParams.get('error');
  // Sanitized against open redirects — only same-site paths pass.
  const next = safeNextPath(url.searchParams.get('next')) ?? '/';

  if (providerError) {
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
      const provider = data?.session?.user?.app_metadata?.provider;
      const providerToken = data?.session?.provider_token;
      if (provider === 'twitch' && typeof providerToken === 'string' && providerToken.length > 0) {
        const nextUrl = new URL(next, url.origin).toString();
        return twitchTokenCaptureResponse(providerToken, nextUrl);
      }
      return NextResponse.redirect(new URL(next, url.origin));
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
