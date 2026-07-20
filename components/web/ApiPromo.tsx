import Link from 'next/link';
import { localeHref, type UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';

/**
 * ApiPromo
 *
 * Developer API promo section for the home page. Currently a Coming-Soon
 * teaser — links to the /developers waitlist. Switch back to the full
 * "Get an API key / Read the docs" CTAs once the public API launches.
 */
export function ApiPromo({ locale = 'en' }: { locale?: UiLang }) {
  const L = hubLexFor(locale);
  return (
    <section className="api-promo-section" aria-labelledby="api-promo-heading">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/[0.06] pb-3.5">
        <h2
          id="api-promo-heading"
          className="text-2xl font-bold tracking-tight text-text-primary"
        >
          {L.apiPromo.heading}
        </h2>
        <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">
          {L.apiPromo.comingSoon}
        </span>
      </div>

      <div className="api-promo">
        <div className="api-promo-grid">
          <div className="api-promo-copy">
            <span className="api-eyebrow">
              <span className="api-eyebrow-tag">/&nbsp;DEV</span>
              {L.apiPromo.eyebrow}
            </span>
            <h3 className="api-h2">
              {L.apiPromo.headlineLead}{' '}
              <span className="api-key">{L.apiPromo.headlineKey}</span>
            </h3>
            <p className="api-sub">{L.apiPromo.body}</p>
            <div className="api-feats">
              {L.apiPromo.bullets.map((bullet) => (
                <div key={bullet} className="api-feat">
                  <span className="af-bullet" />
                  {bullet}
                </div>
              ))}
            </div>
            <div className="api-actions">
              <Link href={localeHref(locale, '/developers')} className="api-cta-primary">
                {L.apiPromo.cta}
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="api-promo-snippet" aria-hidden="true">
            <div className="aps-chrome">
              <span className="aps-dot" />
              <span className="aps-dot" />
              <span className="aps-dot" />
              <span className="aps-path">
                GET&nbsp;&nbsp;api.streamertimes.com/v1/live
              </span>
            </div>
            <pre className="aps-code">
              <code>
                <span className="aps-line">
                  <span className="c-key">curl</span>{' '}
                  <span className="c-flag">-H</span>{' '}
                  <span className="c-str">
                    &quot;Authorization: Bearer $KEY&quot;
                  </span>{' '}
                  \
                </span>
                <span className="aps-line">
                  {'     '}https://api.streamertimes.com/
                  <span className="c-num">v1</span>/live
                </span>
                <span className="aps-line">&nbsp;</span>
                <span className="aps-line">
                  <span className="c-comment">{'// → 200 OK'}</span>
                </span>
                <span className="aps-line">
                  <span className="c-punct">{'{'}</span>
                </span>
                <span className="aps-line">
                  {'  '}
                  <span className="c-key">&quot;live&quot;</span>:{' '}
                  <span className="c-num">847</span>,
                </span>
                <span className="aps-line">
                  {'  '}
                  <span className="c-key">&quot;streamers&quot;</span>:{' '}
                  <span className="c-punct">[</span>
                </span>
                <span className="aps-line">
                  {'    '}
                  <span className="c-punct">{'{'}</span>
                </span>
                <span className="aps-line">
                  {'      '}
                  <span className="c-key">&quot;id&quot;</span>:{' '}
                  <span className="c-str">&quot;kaicenat&quot;</span>,
                </span>
                <span className="aps-line">
                  {'      '}
                  <span className="c-key">&quot;platform&quot;</span>:{' '}
                  <span className="c-str">&quot;twitch&quot;</span>,
                </span>
                <span className="aps-line">
                  {'      '}
                  <span className="c-key">&quot;viewers&quot;</span>:{' '}
                  <span className="c-num">142_309</span>,
                </span>
                <span className="aps-line">
                  {'      '}
                  <span className="c-key">&quot;started_at&quot;</span>:{' '}
                  <span className="c-str">&quot;02:14Z&quot;</span>
                </span>
                <span className="aps-line">
                  {'    '}
                  <span className="c-punct">{'}'}</span>,{' '}
                  <span className="c-comment">…</span>
                </span>
                <span className="aps-line">
                  {'  '}
                  <span className="c-punct">]</span>
                </span>
                <span className="aps-line">
                  <span className="c-punct">{'}'}</span>
                </span>
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
