// "How predictions work" (2026-08-27): public methodology page for the AI
// stream predictions and the HIGH / MEDIUM / LOW confidence badges. It
// explains the sources and the badge semantics — deliberately WITHOUT the
// recipe (no thresholds, cadences or pipeline internals; see the header of
// lib/methodology-predictions.ts).
//
// EN-only content page (privacy-policy / income-estimates pattern): indexable
// at /methodology/predictions, noindex+follow self-canonical on every other
// locale. ISR hourly for the live "Prediction check" box (anon-REST, never
// throws; the box simply hides when the numbers are unavailable).
//
// Linked from: footer (every page), the homepage "Prediction check" fact, the
// streamer-page and /tonight FAQs, the slot reasoning box, /support and the
// income-estimates page. Listed in app/sitemap.ts + public/llms.txt.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { absoluteLocaleUrl, applyLocaleSeo, buildBreadcrumbJsonLd, jsonLdHtml } from '@/lib/seo';
import { FAQItem } from '@/components/web/FAQItem';
import {
  CancelledBadge,
  ConfidenceBadge,
  LiveBadge,
  NewBadge,
  UncertainBadge,
} from '@/components/web/Badges';
import {
  CALIBRATION_HEADING,
  CALIBRATION_NOTE,
  CALIBRATION_ROW,
  CONFIDENCE_FEEDBACK,
  CONFIDENCE_INTRO,
  CONFIDENCE_TIERS_COPY,
  HOW_IT_IS_BUILT,
  HOW_WE_GRADE,
  LIMITS,
  FOR_STREAMERS,
  OTHER_BADGES,
  OTHER_BADGES_NOTE,
  PREDICTIONS_FAQ,
  PREDICTIONS_METHODOLOGY_DESCRIPTION,
  PREDICTIONS_METHODOLOGY_H1,
  PREDICTIONS_METHODOLOGY_INTRO,
  PREDICTIONS_METHODOLOGY_PATH,
  PREDICTIONS_METHODOLOGY_PUBLISHED_ISO,
  PREDICTIONS_METHODOLOGY_SUBTITLE,
  PREDICTIONS_METHODOLOGY_TITLE,
  PREDICTIONS_METHODOLOGY_UPDATED_ISO,
  PREDICTIONS_METHODOLOGY_UPDATED_LABEL,
  PREDICTION_SOURCES,
  WHEN_PREDICTIONS_CHANGE,
  type MethodologySection,
} from '@/lib/methodology-predictions';
import {
  CONFIDENCE_TIERS,
  fetchPredictionAccuracyByTier,
  hasAnyTierAccuracy,
} from '@/lib/server/prediction-accuracy';

// Hourly ISR: the calibration box reads last week's graded predictions.
export const revalidate = 3600;

const CANONICAL_URL = absoluteLocaleUrl('en', PREDICTIONS_METHODOLOGY_PATH);
const SITE_ORIGIN = absoluteLocaleUrl('en', '/');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const meta: Metadata = {
    title: PREDICTIONS_METHODOLOGY_TITLE,
    description: PREDICTIONS_METHODOLOGY_DESCRIPTION,
    alternates: { canonical: PREDICTIONS_METHODOLOGY_PATH },
    openGraph: {
      type: 'article',
      title: PREDICTIONS_METHODOLOGY_H1,
      description: PREDICTIONS_METHODOLOGY_DESCRIPTION,
      url: CANONICAL_URL,
      siteName: 'Streamer Times',
      publishedTime: PREDICTIONS_METHODOLOGY_PUBLISHED_ISO,
      modifiedTime: PREDICTIONS_METHODOLOGY_UPDATED_ISO,
    },
  };
  // M22 P3 en-only matrix: pass-through for 'en', noindex,follow +
  // self-canonical for every other locale variant. ALWAYS the last call.
  return applyLocaleSeo(meta, locale, PREDICTIONS_METHODOLOGY_PATH);
}

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: '#sources', label: 'The three sources' },
  { href: `#${HOW_IT_IS_BUILT.id}`, label: 'How a prediction is built' },
  { href: '#confidence', label: 'Confidence badges' },
  { href: '#badges', label: 'Other badges' },
  { href: `#${WHEN_PREDICTIONS_CHANGE.id}`, label: 'When predictions change' },
  { href: `#${HOW_WE_GRADE.id}`, label: 'How we grade ourselves' },
  { href: `#${FOR_STREAMERS.id}`, label: 'For streamers' },
  { href: '#faq', label: 'FAQ' },
];

const H2_CLASS = 'mb-3 text-xl font-bold text-text-primary';
const P_CLASS = 'mb-3 text-sm leading-relaxed text-text-secondary';
const LI_CLASS = 'text-sm leading-relaxed text-text-secondary';

function Section({ section }: { section: MethodologySection }) {
  return (
    <section id={section.id} className="mb-12 scroll-mt-24">
      <h2 className={H2_CLASS}>{section.heading}</h2>
      {section.paragraphs.map((paragraph, i) => (
        <p key={i} className={P_CLASS}>
          {paragraph}
        </p>
      ))}
      {section.bullets && (
        <ul className="mb-3 list-disc space-y-2 pl-5">
          {section.bullets.map((item, i) => (
            <li key={i} className={LI_CLASS}>
              {item}
            </li>
          ))}
        </ul>
      )}
      {section.afterBullets?.map((paragraph, i) => (
        <p key={i} className={P_CLASS}>
          {paragraph}
        </p>
      ))}
    </section>
  );
}

function BadgeFor({ id }: { id: (typeof OTHER_BADGES)[number]['id'] }) {
  switch (id) {
    case 'new':
      return <NewBadge />;
    case 'uncertain':
      return <UncertainBadge />;
    case 'cancelled':
      return <CancelledBadge />;
    case 'live':
      return <LiveBadge size="sm" />;
  }
}

export default async function PredictionsMethodologyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const tiers = await fetchPredictionAccuracyByTier();
  const showCalibration = hasAnyTierAccuracy(tiers);

  // Structured data only on the indexable (English) variant — the others are
  // noindex and must not claim the canonical URL as their own entity.
  const breadcrumb =
    locale === 'en'
      ? buildBreadcrumbJsonLd([
          { name: 'Streamer Times', url: SITE_ORIGIN },
          { name: PREDICTIONS_METHODOLOGY_H1 },
        ])
      : null;
  const article =
    locale === 'en'
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: PREDICTIONS_METHODOLOGY_H1,
          description: PREDICTIONS_METHODOLOGY_DESCRIPTION,
          url: CANONICAL_URL,
          mainEntityOfPage: CANONICAL_URL,
          inLanguage: 'en',
          datePublished: PREDICTIONS_METHODOLOGY_PUBLISHED_ISO,
          dateModified: PREDICTIONS_METHODOLOGY_UPDATED_ISO,
          image: [`${CANONICAL_URL}/opengraph-image`],
          author: { '@type': 'Organization', name: 'Streamer Times', url: SITE_ORIGIN },
          publisher: { '@type': 'Organization', name: 'Streamer Times', url: SITE_ORIGIN },
        }
      : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {breadcrumb && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
        />
      )}
      {article && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(article) }}
        />
      )}

      <Link
        href={localeHref(locale, '/')}
        className="mb-8 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-accent-cyan"
      >
        <ArrowLeft size={16} />
        Back to Streamer Times
      </Link>

      <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent-cyan">
        Methodology
      </p>
      <h1 className="mb-3 text-3xl font-bold text-text-primary">{PREDICTIONS_METHODOLOGY_H1}</h1>
      <p className="mb-3 text-base leading-relaxed text-text-secondary">
        {PREDICTIONS_METHODOLOGY_SUBTITLE}
      </p>
      <p className="mb-8 text-sm text-text-muted">
        Last updated: {PREDICTIONS_METHODOLOGY_UPDATED_LABEL}
      </p>

      <nav aria-label="On this page" className="mb-12 flex flex-wrap gap-2">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-border-default bg-background-elevated px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent-cyan/50 hover:text-accent-cyan"
          >
            {item.label}
          </a>
        ))}
      </nav>

      {PREDICTIONS_METHODOLOGY_INTRO.map((paragraph, i) => (
        <p key={i} className="mb-3 text-sm leading-relaxed text-text-secondary">
          {paragraph}
        </p>
      ))}

      {/* 1 — Sources */}
      <section id="sources" className="mb-12 mt-10 scroll-mt-24">
        <h2 className={H2_CLASS}>The three sources every prediction is built from</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PREDICTION_SOURCES.map((source, index) => (
            <article
              key={source.id}
              id={source.id}
              className="min-w-0 rounded-xl border border-border-default bg-background-elevated p-5"
            >
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent-cyan">
                {index + 1}
              </p>
              <h3 className="mt-1 text-base font-semibold text-text-primary">{source.title}</h3>
              {source.paragraphs.map((paragraph, i) => (
                <p key={i} className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {paragraph}
                </p>
              ))}
            </article>
          ))}
        </div>
      </section>

      {/* 2 — How it is built */}
      <Section section={HOW_IT_IS_BUILT} />

      {/* 3 — Confidence badges */}
      <section id="confidence" className="mb-12 scroll-mt-24">
        <h2 className={H2_CLASS}>What the confidence badges mean</h2>
        {CONFIDENCE_INTRO.map((paragraph, i) => (
          <p key={i} className={P_CLASS}>
            {paragraph}
          </p>
        ))}
        <div className="mt-5 space-y-4">
          {CONFIDENCE_TIERS_COPY.map((tier) => (
            <article
              key={tier.level}
              id={`confidence-${tier.level}`}
              className="rounded-xl border border-border-default bg-background-elevated p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <ConfidenceBadge level={tier.level} language={locale} />
                <h3 className="text-base font-semibold text-text-primary">{tier.tagline}</h3>
              </div>
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                {tier.signals.map((signal, i) => (
                  <li key={i} className={LI_CLASS}>
                    {signal}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-text-primary">{tier.inPractice}</p>
            </article>
          ))}
        </div>
        <p className="mt-5 text-sm leading-relaxed text-text-secondary">{CONFIDENCE_FEEDBACK}</p>

        {showCalibration && (
          <aside
            aria-labelledby="calibration-heading"
            className="mt-6 rounded-xl border border-accent-cyan/40 bg-background-elevated p-5 shadow-[0_0_16px_rgba(0,240,255,0.10)]"
          >
            <h3
              id="calibration-heading"
              className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent-cyan"
            >
              {CALIBRATION_HEADING}
            </h3>
            <ul className="mt-3 space-y-3">
              {CONFIDENCE_TIERS.map((level) => {
                const value = tiers[level];
                if (!value) return null;
                return (
                  <li key={level} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="w-20 shrink-0">
                      <ConfidenceBadge level={level} size="sm" language={locale} />
                    </span>
                    <span className="text-2xl font-extrabold tabular-nums text-white">
                      {value.pct} %
                    </span>
                    <span className="text-sm text-text-secondary">
                      {CALIBRATION_ROW(value.hits, value.total)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-text-muted">{CALIBRATION_NOTE}</p>
          </aside>
        )}
      </section>

      {/* 4 — Other badges */}
      <section id="badges" className="mb-12 scroll-mt-24">
        <h2 className={H2_CLASS}>The other badges you’ll see</h2>
        <ul className="space-y-3">
          {OTHER_BADGES.map((badge) => (
            <li key={badge.id} className="flex items-start gap-3">
              <span className="flex w-24 shrink-0 items-center pt-0.5">
                <BadgeFor id={badge.id} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-text-primary">{badge.title}</span>
                <span className="block text-sm leading-relaxed text-text-secondary">
                  {badge.body}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-text-muted">{OTHER_BADGES_NOTE}</p>
      </section>

      {/* 5–8 */}
      <Section section={WHEN_PREDICTIONS_CHANGE} />
      <Section section={HOW_WE_GRADE} />
      <Section section={LIMITS} />
      <Section section={FOR_STREAMERS} />
      <p className="-mt-8 mb-12 text-sm text-text-secondary">
        See who does this best on the{' '}
        <Link
          href={localeHref(locale, '/rankings/most-reliable')}
          className="font-medium text-accent-cyan transition-colors hover:text-text-primary"
        >
          most punctual streamers ranking
        </Link>
        .
      </p>

      {/* FAQ — visible text only, deliberately no FAQPage JSON-LD (site rule). */}
      <section id="faq" className="mb-12 scroll-mt-24">
        <h2 className={H2_CLASS}>Frequently asked questions</h2>
        <div className="mt-2">
          {PREDICTIONS_FAQ.map((item) => (
            <FAQItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </section>

      {/* Related */}
      <section aria-labelledby="related-heading" className="mb-4">
        <h2 id="related-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
          See the predictions in action
        </h2>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {[
            { href: '/tonight', label: 'Streaming tonight' },
            { href: '/live', label: "Who's live now" },
            { href: '/rankings/most-reliable', label: 'Most punctual streamers' },
            { href: '/app', label: 'Get go-live alerts in the app' },
            { href: '/developers', label: 'Predictions via the Partner API' },
            { href: '/methodology/income-estimates', label: 'How we estimate streamer income' },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={localeHref(locale, link.href)}
                className="text-accent-cyan transition-colors hover:text-text-primary"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-16 border-t border-divider pt-8 text-center text-sm text-text-muted">
        &copy; {new Date().getFullYear()} Streamer Times. All rights reserved.
      </footer>
    </main>
  );
}
