// M26: teaser for the streamer wiki subpage — rendered on the streamer page
// whenever a published wiki profile exists. Server component; strings arrive
// pre-localized from the page's lexicon (unlike the insights teaser, the link
// is locale-prefixed via localeHref so /de stays in /de).

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { localeHref, type UiLang } from '@/lib/i18n-core';

export function WikiTeaserCard({
  locale,
  slug,
  name,
  title,
  subtitle,
}: {
  locale: UiLang;
  slug: string;
  name: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section aria-label={`${name} wiki teaser`} className="mt-8">
      <Link
        href={localeHref(locale, `/streamer/${encodeURIComponent(slug)}/wiki`)}
        className="group flex items-center gap-4 rounded-xl border border-border-default bg-background-elevated p-4 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-default bg-background text-accent-cyan">
          <BookOpen size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text-primary group-hover:text-accent-cyan">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-text-secondary">{subtitle}</span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-accent-cyan">
          →
        </span>
      </Link>
    </section>
  );
}
