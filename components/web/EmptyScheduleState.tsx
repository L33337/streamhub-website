import Link from 'next/link';
import type { PublicStreamer } from '@/lib/server/partner-api';
import { listConjunction, localeHref, resolveUiLang } from '@/lib/i18n-core';
import { uiLexFor } from '@/lib/i18n-ui';
import { dirFor } from '@/lib/seo';

interface Props {
  streamer: PublicStreamer;
  // M22 (D6): UI strings follow the viewer's locale; defaults to the
  // streamer's language for pre-M22 call sites.
  uiLanguage?: string | null;
}

export function EmptyScheduleState({ streamer, uiLanguage }: Props) {
  const ui = uiLanguage ?? streamer.language;
  const lang = resolveUiLang(ui);
  const L = uiLexFor(ui);
  const names =
    streamer.platforms.length > 0
      ? streamer.platforms.map((p) => (p === 'twitch' ? 'Twitch' : 'YouTube'))
      : ['Twitch', 'YouTube'];
  const platforms = listConjunction(names, lang);

  return (
    <section
      className="mt-10 gradient-border p-8 text-center"
      aria-labelledby="empty-heading"
    >
      <h2 id="empty-heading" className="text-2xl font-bold text-white">
        {L.empty.heading}
      </h2>
      <p
        className="mt-3 text-text-secondary max-w-xl mx-auto"
        dir={dirFor(ui)}
      >
        {L.empty.body(streamer.name, platforms)}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={localeHref(lang, '/')}
          className="inline-flex items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
        >
          {L.empty.browseAll}
        </Link>
        <Link
          href={localeHref(lang, '/app')}
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          {L.promo.getApp}
        </Link>
      </div>
    </section>
  );
}
