const STORAGE_KEY = 'twitchProviderToken';

export const TWITCH_TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

interface StoredToken {
  token: string;
  expiresAt: number;
}

export function readTwitchToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as StoredToken).token !== 'string' ||
      typeof (parsed as StoredToken).expiresAt !== 'number'
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const { token, expiresAt } = parsed as StoredToken;
    if (Date.now() >= expiresAt) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Persist a freshly-obtained Twitch access token for the follows import. Used
 * by the /auth/twitch-import return page (implicit-grant flow); the OAuth
 * callback captures Twitch-first sign-in tokens the same way via an inline
 * script. TTL matches a Twitch user access token's ~4h lifetime.
 */
export function writeTwitchToken(
  token: string,
  ttlMs: number = TWITCH_TOKEN_TTL_MS,
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredToken = { token, expiresAt: Date.now() + ttlMs };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / disabled-storage errors */
  }
}

export function clearTwitchToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore quota / disabled-storage errors */
  }
}
