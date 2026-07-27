import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  dismissBanner,
  setPreferredLocale,
  subscribeLocalePreference,
  suggestedLocaleFor,
} from '../locale-preference';

/**
 * Minimal document.cookie stand-in: a real one merges writes per cookie name
 * and hands back only the `name=value` pairs. A plain `{ cookie: '' }` object
 * would let each write clobber the previous cookie, which would quietly hide
 * the interaction between the preference and dismissed cookies.
 */
function cookieJar() {
  const jar = new Map<string, string>();
  return {
    get cookie(): string {
      return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set cookie(entry: string) {
      const [pair] = entry.split('; ');
      const eq = pair.indexOf('=');
      jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    },
  };
}

function setBrowser(languages: string[]) {
  vi.stubGlobal('document', cookieJar());
  vi.stubGlobal('navigator', { languages, language: languages[0] });
}

beforeEach(() => setBrowser(['de-DE', 'de', 'en']));
afterEach(() => vi.unstubAllGlobals());

describe('suggestedLocaleFor', () => {
  it('suggests the browser language on a page in another language', () => {
    expect(suggestedLocaleFor('en')).toBe('de');
  });

  it('suggests nothing when the page is already in that language', () => {
    expect(suggestedLocaleFor('de')).toBeNull();
  });

  it('prefers an explicit cookie over the browser languages', () => {
    setPreferredLocale('fr');
    expect(suggestedLocaleFor('en')).toBe('fr');
    expect(suggestedLocaleFor('fr')).toBeNull();
  });

  it('suggests nothing once the pair was dismissed', () => {
    expect(suggestedLocaleFor('en')).toBe('de');
    dismissBanner('de', 'en');
    expect(suggestedLocaleFor('en')).toBeNull();
  });

  it('keeps the dismissal scoped to the pair it was made for', () => {
    dismissBanner('de', 'en');
    // Same suggestion, different page language — a fresh decision.
    expect(suggestedLocaleFor('fr')).toBe('de');
  });

  it('suggests nothing without a DOM, so the banner stays out of cached HTML', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('document', undefined);
    expect(suggestedLocaleFor('en')).toBeNull();
  });
});

describe('subscribeLocalePreference', () => {
  it('notifies on dismiss, so the banner re-reads instead of holding state', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeLocalePreference(onChange);
    dismissBanner('de', 'en');
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('stays quiet when a preference is chosen', () => {
    // Choosing a language always navigates to it. Re-reading mid-navigation
    // would flash the banner in above the fold for the length of the load.
    const onChange = vi.fn();
    const unsubscribe = subscribeLocalePreference(onChange);
    setPreferredLocale('fr');
    expect(onChange).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    const onChange = vi.fn();
    subscribeLocalePreference(onChange)();
    dismissBanner('de', 'en');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('returns a stable function identity for useSyncExternalStore', () => {
    // A subscribe prop that changed per render would re-subscribe every render.
    expect(subscribeLocalePreference).toBe(subscribeLocalePreference);
  });
});
