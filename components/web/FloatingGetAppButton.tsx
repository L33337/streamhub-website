'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useGetAppTarget } from '@/lib/use-get-app-target';
import { localeHref, stripLocaleFromPath, type UiLang } from '@/lib/i18n-core';

// Once the reader scrolls past this the button collapses to icon-only — the
// full pill floats over data-dense content (heatmaps, chart toggles) on
// phones, and after the first viewport its label has served its purpose.
const COLLAPSE_SCROLL_Y = 160;

export function FloatingGetAppButton({
  locale = 'en',
  label = 'Get the App',
}: {
  locale?: UiLang;
  /** Localized button text; doubles as the aria-label. */
  label?: string;
} = {}) {
  const pathname = usePathname();
  const target = useGetAppTarget();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > COLLAPSE_SCROLL_Y);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Strip the locale first: the old `startsWith('/auth')` check only matched
  // the English tree, so the button still floated over /de/auth/login and the
  // ten other localized sign-in pages.
  if (stripLocaleFromPath(pathname ?? '').startsWith('/auth')) {
    return null;
  }

  // A store URL is absolute and locale-less; only the in-app /app fallback
  // belongs in the reader's language tree.
  const href = target.external ? target.href : localeHref(locale, target.href);

  return (
    <div
      className="fixed bottom-4 right-4 z-40 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <a
        href={href}
        {...(target.external
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
        aria-label={label}
        className={`inline-flex items-center gap-2 rounded-full border border-border-default bg-background-elevated py-3 text-sm font-semibold text-text-primary shadow-lg transition-all hover:border-accent-cyan/60 hover:bg-background-highlight active:scale-95 ${
          collapsed ? 'px-3' : 'px-4'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 fill-current text-accent-cyan"
          aria-hidden="true"
        >
          <path d="M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V4a1 1 0 0 1 1-1Zm-7 15a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
        </svg>
        {!collapsed && label}
      </a>
    </div>
  );
}
