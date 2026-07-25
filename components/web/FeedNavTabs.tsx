import Link from 'next/link';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { chromeLexFor } from '@/lib/i18n-chrome';

/** The three signed-in pages this switcher moves between. */
export type FeedNavKey = 'feed' | 'program' | 'favorites';

const TABS: readonly { key: FeedNavKey; path: string }[] = [
  { key: 'feed', path: '/feed' },
  { key: 'program', path: '/program' },
  { key: 'favorites', path: '/favorites' },
];

/**
 * Underline tab strip rendered above the <h1> on /feed, /program and
 * /favorites so signed-in users can jump between the three and always see
 * where they are. Pure server component — the active tab is passed in by each
 * page (no client-side pathname needed), links are locale-aware, and the
 * labels come from the shared chrome lexicon so they double as the page title.
 */
export function FeedNavTabs({
  locale,
  active,
  className,
}: {
  locale: UiLang;
  active: FeedNavKey;
  className?: string;
}) {
  const lex = chromeLexFor(locale).feedNav;

  return (
    <nav
      aria-label={lex.sections}
      className={`-mx-4 overflow-x-auto px-4 ${className ?? ''}`}
    >
      <ul className="flex min-w-max items-stretch gap-6 border-b border-divider">
        {TABS.map(({ key, path }) => {
          const isActive = key === active;
          return (
            <li key={key} className="-mb-px">
              <Link
                href={localeHref(locale, path)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center whitespace-nowrap border-b-2 px-0.5 pb-2.5 pt-1 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-accent-cyan text-accent-cyan'
                    : 'border-transparent text-text-secondary hover:border-border-default hover:text-text-primary'
                }`}
              >
                {lex[key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
