'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { chromeLexFor } from '@/lib/i18n-chrome';

// Global 404 — reached via notFound() throws (unknown streamer/game slugs
// etc.) AND via the [...notFound] catch-all page, which claims every
// unmatched URL after the middleware rewrote it into the locale tree. A
// not-found.tsx alone never fires for unmatched routes in Next 16 — without
// the catch-all this page was dead code for unknown URLs and visitors got
// the unbranded framework 404.
// Client component: not-found files receive no params, so the locale comes
// from useParams(). Still fully static in effect — no data fetch, no cookies.
export default function NotFound() {
  const params = useParams<{ locale?: string }>();
  const locale: UiLang =
    params?.locale && isUiLang(params.locale) ? params.locale : 'en';
  const nf = chromeLexFor(locale).notFound;

  return (
    <main className="container mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-sm uppercase tracking-widest text-text-muted">{nf.kicker}</p>
      <h1 className="mt-4 text-4xl font-bold text-white">{nf.title}</h1>
      <p className="mt-4 text-text-secondary">{nf.body}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href={localeHref(locale, '/')}
          className="inline-flex items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
        >
          {nf.home}
        </Link>
        <Link
          href={localeHref(locale, '/live')}
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          {nf.liveNow}
        </Link>
        <Link
          href={localeHref(locale, '/streamers')}
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          {nf.browseStreamers}
        </Link>
        <Link
          href={localeHref(locale, '/games')}
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          {nf.games}
        </Link>
        <Link
          href={localeHref(locale, '/app')}
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          {nf.getApp}
        </Link>
      </div>
    </main>
  );
}
