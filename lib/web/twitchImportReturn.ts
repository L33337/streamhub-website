// Pure evaluation of the Twitch implicit-grant return (/auth/twitch-import).
// Kept side-effect-free so it is unit-testable; the client component owns the
// window/sessionStorage/localStorage reads and the navigation.

import { safeNextPath } from '@/lib/auth-flag';
import { TWITCH_IMPORT_SCOPES } from '@/lib/twitch-scopes';

export const TWITCH_IMPORT_REQUIRED_SCOPE = 'user:read:follows';
export const TWITCH_IMPORT_DEFAULT_NEXT = '/onboarding?step=import';

// Sanity: the required scope must be one we actually request.
if (!TWITCH_IMPORT_SCOPES.split(' ').includes(TWITCH_IMPORT_REQUIRED_SCOPE)) {
  throw new Error('TWITCH_IMPORT_REQUIRED_SCOPE is not in TWITCH_IMPORT_SCOPES');
}

export interface TwitchImportReturnResult {
  /** Sanitized same-site path to return to (wizard import step by default). */
  next: string;
  /** Non-null on success — the Twitch access token to persist. */
  token: string | null;
  /** Non-null on failure — the code appended as ?connect_error= on `next`. */
  connectError: string | null;
}

export interface TwitchImportReturnInput {
  /** location.hash — Twitch puts the implicit token here (with/without `#`). */
  hash: string;
  /** location.search — provider errors arrive here (with/without `?`). */
  search: string;
  /** The state we stored before the round-trip, or null if unavailable. */
  storedState: string | null;
  /** The return path we stored before the round-trip, or null. */
  storedNext: string | null;
}

/**
 * Decides what the return page should do. Order matters:
 *   1. provider error (user denied / Twitch failure) → bounce with its code
 *   2. CSRF: if we stored a state, the returned one must match
 *   3. missing token → bounce
 *   4. token present but missing the follows scope → bounce
 *   5. otherwise → persist the token and bounce cleanly
 */
export function evaluateTwitchImportReturn(
  input: TwitchImportReturnInput,
): TwitchImportReturnResult {
  const hashParams = new URLSearchParams(input.hash.replace(/^#/, ''));
  const query = new URLSearchParams(input.search.replace(/^\?/, ''));
  const next = safeNextPath(input.storedNext) ?? TWITCH_IMPORT_DEFAULT_NEXT;

  const providerError = query.get('error') || hashParams.get('error');
  if (providerError) return { next, token: null, connectError: providerError };

  const returnedState = hashParams.get('state');
  if (input.storedState && returnedState !== input.storedState) {
    return { next, token: null, connectError: 'state_mismatch' };
  }

  const token = hashParams.get('access_token');
  if (!token) return { next, token: null, connectError: 'no_token' };

  const scope = hashParams.get('scope') ?? '';
  const grantedScopes = scope.split(' ').filter(Boolean);
  if (grantedScopes.length > 0 && !grantedScopes.includes(TWITCH_IMPORT_REQUIRED_SCOPE)) {
    return { next, token: null, connectError: 'scope_denied' };
  }

  return { next, token, connectError: null };
}

/**
 * Friendly copy for a `connect_error` code surfaced by the return page — shared
 * by the onboarding wizard and the Settings import so the messaging stays in
 * sync. Unknown codes fall back to the generic line.
 */
export function connectErrorCopy(code: string): string {
  switch (code) {
    case 'access_denied':
      return 'Twitch connection was cancelled. You can try again or pick your favorites manually.';
    case 'scope_denied':
      return 'We need permission to read your Twitch follows. Try again and approve access, or pick your favorites manually.';
    default:
      return 'Connecting to Twitch failed. You can try again or pick your favorites manually.';
  }
}

/** Builds the same-site path to navigate to, appending ?connect_error= when set. */
export function twitchImportReturnTarget(result: TwitchImportReturnResult): string {
  if (!result.connectError) return result.next;
  const [path, existingQs] = result.next.split('?');
  const params = new URLSearchParams(existingQs ?? '');
  params.set('connect_error', result.connectError);
  return `${path}?${params.toString()}`;
}
