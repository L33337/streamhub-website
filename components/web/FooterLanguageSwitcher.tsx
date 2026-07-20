'use client';

import { usePathname } from 'next/navigation';
import { UI_LANGS, isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { LANGUAGE_NATIVE_NAMES } from '@/lib/i18n-chrome';
import { setPreferredLocale } from '@/lib/locale-preference';

/**
 * M22 footer language switcher: one real <a href> per UI language, linking the
 * SAME page in every locale (`/de/streamer/foo` ↔ `/streamer/foo`). Plain
 * anchors (not next/link) on purpose — a locale switch swaps the whole tree,
 * and crawlers following these links discover every locale variant (the
 * internal-link mesh hreflang benefits from in P3).
 *
 * Client island because the current pathname is unavailable to server
 * components without `headers()` (K1 rule). Selecting a language writes the
 * NEXT_LOCALE cookie — read ONLY client-side (suggestion banner); the server
 * never varies rendering on it.
 */

/** Strip a leading locale segment: '/de/streamer/x' → '/streamer/x'. */
export function stripLocalePrefix(pathname: string): string {
  const [, first, ...rest] = pathname.split('/');
  if (isUiLang(first)) {
    const stripped = `/${rest.join('/')}`;
    return stripped === '//' ? '/' : stripped;
  }
  return pathname || '/';
}

export function FooterLanguageSwitcher({
  currentLocale,
  heading,
}: {
  currentLocale: UiLang;
  heading: string;
}) {
  const pathname = usePathname() ?? '/';
  const basePath = stripLocalePrefix(pathname);

  return (
    <nav aria-label={heading}>
      <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">{heading}</h2>
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-1">
        {UI_LANGS.map((lang) => (
          <li key={lang}>
            <a
              href={localeHref(lang, basePath)}
              lang={lang}
              hrefLang={lang}
              aria-current={lang === currentLocale ? 'true' : undefined}
              onClick={() => setPreferredLocale(lang)}
              className={
                lang === currentLocale
                  ? 'text-sm font-semibold text-accent-cyan'
                  : 'text-sm text-text-secondary transition-colors hover:text-accent-cyan'
              }
            >
              {LANGUAGE_NATIVE_NAMES[lang]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
