'use client';

// Client-side "Connect Twitch" for the follows import (onboarding wizard +
// Settings). Obtains a short-lived Twitch OAuth access token (user:read:follows)
// via Twitch's own implicit-grant flow — DELIBERATELY decoupled from Supabase
// identity linking.
//
// Why not linkIdentity / signInWithOAuth (the previous approach)?
//   The import edge function only needs a Twitch token; it never needs the
//   Twitch identity permanently attached to the Streamer Times account.
//   linkIdentity fails hard ("422: Identity is already linked to another user")
//   whenever that Twitch account is already tied to a DIFFERENT ST account —
//   which is the case for anyone who has ever used "Continue with Twitch", so
//   an email/Google user could never import. This flow sidesteps that entirely:
//   it fetches a token for whichever Twitch account the browser is signed into
//   and changes nothing about the ST session or its identities.
//
// The token comes back in the URL fragment on the return page
// (/auth/twitch-import), which stashes it in localStorage
// (lib/web/twitchToken.ts) — the same slot the OAuth-callback capture uses for
// Twitch-first sign-ins, so useTwitchImport picks it up unchanged.
//
// ⚠ The redirect URI below must be registered in the Twitch developer console
// (prod + http://localhost:3000 for dev) and NEXT_PUBLIC_TWITCH_CLIENT_ID must
// be set — see the website AGENTS.md ("Twitch follows import").

import { resolveSiteUrl } from '@/lib/auth-email';
import { TWITCH_IMPORT_SCOPES } from '@/lib/twitch-scopes';

const TWITCH_AUTHORIZE_URL = 'https://id.twitch.tv/oauth2/authorize';

/** CSRF state + return path survive the round-trip here (sessionStorage). */
export const TWITCH_IMPORT_OAUTH_STATE_KEY = 'twitchImportOAuthState';

export interface TwitchImportOAuthState {
  state: string;
  next: string;
}

/**
 * The exact redirect URI the implicit flow returns to — must byte-for-byte
 * match a URL registered in the Twitch developer console. Shared with the
 * return page so both agree on it.
 */
export function twitchImportRedirectUri(): string {
  return `${resolveSiteUrl()}/auth/twitch-import`;
}

function randomState(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Starts the Twitch implicit-grant round-trip for the follows import. On
 * success the browser navigates to Twitch and never returns here, so callers
 * only ever observe the pre-flight error case. `nextPath` is the same-site
 * path the return page sends the user back to (the wizard's import step or the
 * settings page).
 */
export function startTwitchFollowImport(nextPath: string): { error: string | null } {
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  if (!clientId) {
    return {
      error:
        'Twitch import isn’t available right now. Please pick your favorites manually.',
    };
  }

  const state = randomState();
  try {
    const payload: TwitchImportOAuthState = { state, next: nextPath };
    sessionStorage.setItem(TWITCH_IMPORT_OAUTH_STATE_KEY, JSON.stringify(payload));
  } catch {
    /* sessionStorage disabled — the return page falls back to a default next */
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: twitchImportRedirectUri(),
    response_type: 'token',
    scope: TWITCH_IMPORT_SCOPES,
    state,
  });
  window.location.assign(`${TWITCH_AUTHORIZE_URL}?${params.toString()}`);
  return { error: null };
}
