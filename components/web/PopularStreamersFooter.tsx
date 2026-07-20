import Link from 'next/link';
import type { PublicStreamer } from '@/lib/server/partner-api';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';

interface Props {
  streamers: PublicStreamer[];
  locale?: UiLang;
}

export function PopularStreamersFooter({ streamers, locale = 'en' }: Props) {
  if (streamers.length === 0) return null;
  const L = hubLexFor(locale);
  return (
    <footer
      className="mt-20 border-t border-divider pt-8"
      aria-labelledby="popular-heading"
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          id="popular-heading"
          className="text-sm font-bold uppercase tracking-widest text-text-muted"
        >
          {L.popular.heading}
        </h2>
        <Link
          href={localeHref(locale, '/streamers')}
          className="shrink-0 text-sm font-semibold text-accent-cyan transition-colors hover:text-text-primary"
        >
          {L.popular.viewAll}
        </Link>
      </div>
      <nav aria-label={L.popular.heading} className="mt-4 flex flex-wrap gap-2">
        {streamers.map((s) => (
          <Link
            key={s.id}
            href={localeHref(locale, `/streamer/${encodeURIComponent(s.id)}`)}
            className="inline-flex items-center rounded-full border border-border-default bg-background-elevated px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-accent-cyan/60 hover:text-text-primary"
          >
            {s.name}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
