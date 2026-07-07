// Website auth feature flag (M16 follow-up).
//
// Auth is DORMANT by default. To activate it, set NEXT_PUBLIC_AUTH_ENABLED=true
// (Vercel env var) and redeploy — no code changes needed. The flag controls:
//   - /auth/login renders the sign-in UI instead of redirecting to /app
//   - the header mounts <HeaderUserMenu /> (sign-in link / account dropdown)
//   - gated pages (/feed, /feed/interests, /favorites, /settings) send
//     signed-out visitors to /auth/login?next=<page> instead of /app
//   - FavoriteButton's signed-out state links to /auth/login instead of /app
//
// NEXT_PUBLIC_ vars are inlined at BUILD time (server and client bundles),
// so reading this constant keeps the root layout static — flipping the flag
// requires a rebuild/redeploy, which a Vercel env change triggers anyway.
//
// Before activating in production, verify in the Supabase dashboard that the
// Twitch + Google OAuth providers are configured with
// https://streamertimes.tv/auth/callback as a redirect URL.

export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

/**
 * Sanitizes a post-login destination against open redirects: only same-site
 * absolute paths pass ("/feed", "/favorites?x=1"); anything else (absolute
 * URLs, protocol-relative "//evil.com", backslash tricks) returns null.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  return raw;
}

/**
 * Where a gated page sends a signed-out visitor: the sign-in page (with a
 * return path) when auth is enabled, the app-promo page while dormant.
 */
export function signInGateRedirect(nextPath: string): string {
  if (!AUTH_ENABLED) return '/app';
  return `/auth/login?next=${encodeURIComponent(nextPath)}`;
}
