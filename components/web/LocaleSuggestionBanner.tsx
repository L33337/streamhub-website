'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { UiLang } from '@/lib/i18n-core';
import { localeHref } from '@/lib/i18n-core';
import { BANNER_STRINGS } from '@/lib/i18n-banner';
import {
  detectSuggestedLocale,
  dismissBanner,
  isBannerDismissed,
  setPreferredLocale,
} from '@/lib/locale-preference';
import { stripLocalePrefix } from './FooterLanguageSwitcher';

/**
 * M22 language-suggestion banner (D3): compares the browser's preferred
 * language (or the NEXT_LOCALE cookie) against the page locale and offers a
 * link to the same page in the visitor's language. Client-only by design —
 * rendering it on the server would vary cached HTML by visitor (cloaking
 * risk + CDN fragmentation), so the static page ships without it and the
 * banner pops in after hydration. No server-side locale redirects, ever.
 */
export function LocaleSuggestionBanner({ pageLocale }: { pageLocale: UiLang }) {
  const pathname = usePathname() ?? '/';
  const [suggested, setSuggested] = useState<UiLang | null>(null);

  useEffect(() => {
    const detected = detectSuggestedLocale();
    if (detected !== pageLocale && !isBannerDismissed(detected, pageLocale)) {
      setSuggested(detected);
    } else {
      setSuggested(null);
    }
  }, [pageLocale, pathname]);

  if (!suggested) return null;
  const strings = BANNER_STRINGS[suggested];
  const target = localeHref(suggested, stripLocalePrefix(pathname));

  return (
    <div
      lang={suggested}
      className="border-b border-divider bg-background-elevated"
      role="region"
      aria-label={strings.text}
    >
      <div className="container mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm">
        <span className="min-w-0 flex-1 truncate text-text-secondary">{strings.text}</span>
        <a
          href={target}
          onClick={() => setPreferredLocale(suggested)}
          className="shrink-0 rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-3 py-1 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
        >
          {strings.cta}
        </a>
        <button
          type="button"
          aria-label={strings.dismiss}
          onClick={() => {
            dismissBanner(suggested, pageLocale);
            setSuggested(null);
          }}
          className="shrink-0 rounded p-1 text-text-muted hover:text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
