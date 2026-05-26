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

export function clearTwitchToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore quota / disabled-storage errors */
  }
}
