// Website auth feature flags (M16 follow-up).
//
// Auth is DORMANT by default. To activate it, set NEXT_PUBLIC_AUTH_ENABLED=true
// (Vercel env var) and redeploy — no code changes needed. The flag controls:
//   - /auth/login renders the sign-in UI instead of redirecting to /app
//   - the header mounts <HeaderUserMenu /> (sign-in link / account dropdown)
//   - gated pages (/feed, /feed/interests, /favorites, /settings) send
//     signed-out visitors to /auth/login?next=<page> instead of /app
//   - FavoriteButton's signed-out state links to /auth/login instead of /app
//
// EMAIL auth is a SUB-flag on top of that: NEXT_PUBLIC_EMAIL_AUTH_ENABLED=true
// only takes effect while NEXT_PUBLIC_AUTH_ENABLED is also true. It controls:
//   - /auth/login additionally renders the email/password form + sign-up and
//     forgot-password links
//   - /auth/sign-up, /auth/forgot-password, /auth/reset-password render their
//     forms instead of redirecting (dormant: to /auth/login when base auth is
//     on, to /app when everything is off)
// Prerequisites before flipping it in production: Turnstile sitekey hostname,
// custom SMTP, and the conditional email templates — see the activation
// checklist in AGENTS.md ("Email auth sub-flag").
//
// NEXT_PUBLIC_ vars are inlined at BUILD time (server and client bundles),
// so reading this constant keeps the root layout static — flipping the flag
// requires a rebuild/redeploy, which a Vercel env change triggers anyway.
//
// Before activating in production, verify in the Supabase dashboard that the
// Twitch + Google OAuth providers are configured with
// https://streamertimes.tv/auth/callback as a redirect URL.

export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

// Stealth mode for quiet production testing: NEXT_PUBLIC_AUTH_LINKS_HIDDEN=true
// (only meaningful while AUTH_ENABLED is true) keeps every signed-out entry
// point dormant — no "Sign in" link in the header, FavoriteButton's signed-out
// state keeps pointing to /app — while /auth/login and the gated pages remain
// fully functional via direct URL. Signed-IN UI (header avatar menu) is NOT
// affected, so a tester can navigate and sign out normally after logging in.
// Unset the var (+ redeploy) to make auth publicly visible.
export const AUTH_UI_VISIBLE =
  AUTH_ENABLED && process.env.NEXT_PUBLIC_AUTH_LINKS_HIDDEN !== 'true';

export const EMAIL_AUTH_ENABLED =
  AUTH_ENABLED && process.env.NEXT_PUBLIC_EMAIL_AUTH_ENABLED === 'true';

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

/**
 * Where a dormant email-auth page (/auth/sign-up, /auth/forgot-password,
 * /auth/reset-password) sends its visitors while EMAIL_AUTH_ENABLED is off:
 * the OAuth sign-in page when base auth is live, the app-promo page otherwise.
 */
export function emailAuthGateRedirect(): string {
  return AUTH_ENABLED ? '/auth/login' : '/app';
}
