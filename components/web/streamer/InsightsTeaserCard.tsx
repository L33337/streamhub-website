// M24: compact teaser for the (noindex) streamer insights page — the only
// entry point besides direct links, so it renders whenever insights data
// exists. Server component; numbers are nightly aggregates.
//
// Localized since the streamer-page UX round (2026-09-26): title and lines
// come pre-built from the viewer-locale lexicon (lib/i18n-ui.ts `stats`), and
// the link keeps the locale prefix (it used to drop every non-English viewer
// on the English insights page).

import Link from 'next/link';
import { BarChart3 } from 'lucide-react';

export function InsightsTeaserCard({
  href,
  name,
  title,
  highlight,
  blurb,
}: {
  /** Locale-prefixed path of the insights page. */
  href: string;
  name: string;
  title: string;
  /** "Biggest audience on Saturday: about 51K viewers"; null = no agreeing day. */
  highlight: string | null;
  blurb: string;
}) {
  return (
    <section aria-label={`${name}: ${title}`} className="mt-8">
      <Link
        href={href}
        className="group flex items-center gap-4 rounded-xl border border-border-default bg-background-elevated p-4 transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-default bg-background text-accent-cyan">
          <BarChart3 size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text-primary group-hover:text-accent-cyan">
            {title}
          </span>
          {highlight && (
            <span className="mt-0.5 block text-xs text-text-primary">{highlight}</span>
          )}
          <span className="mt-0.5 block text-xs text-text-secondary">{blurb}</span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-accent-cyan">
          →
        </span>
      </Link>
    </section>
  );
}
