import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  applyLocaleSeo,
  buildBreadcrumbJsonLd,
  INDEXABLE_HUB_LOCALES,
  jsonLdHtml,
} from '@/lib/seo';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';
import {
  isRecapLocalized,
  neighborSlugs,
  parseRecapParagraph,
  recapHref,
  recapPeriodLabel,
  streamerNameMap,
} from '@/lib/recaps';
import { loadRecap, loadRecapsList } from '@/lib/server/recaps';
import { formatRefreshedAt } from '@/lib/rankings';
import { RecapCardVisual } from '@/components/web/rankings/RecapCardVisual';

// AI recap article (weekly/monthly ranking highlights, 2026-08-09). Content
// is served per-locale by the partner API (EN fallback when a translation
// hasn't landed → that variant renders with a note and stays noindexed).
// New editions publish Monday 06:30 / 1st 06:45 UTC, translations via a
// daily drip — 15 min keeps both visible without per-request rendering.
export const revalidate = 900;

const SITE_URL = 'https://streamertimes.tv';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

// ISR-K1: prerender known editions for the English tree; the 11 other locale
// variants render on demand (dynamicParams). API down at build → on demand.
export async function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  if (params.locale !== 'en') return [];
  const items = await loadRecapsList('en');
  return items.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const article = await loadRecap(slug, locale);
  if (!article) {
    return { title: 'Not found', robots: { index: false, follow: false } };
  }
  const url = `${SITE_URL}/rankings/recap/${slug}`;
  const meta: Metadata = {
    title: article.title,
    description: article.teaser,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: article.teaser,
      url,
      siteName: 'Streamer Times',
      type: 'article',
      ...(article.published_at ? { publishedTime: article.published_at } : {}),
    },
  };
  // hreflang cluster = hub locales whose translation actually exists — a
  // variant still waiting for its translation serves English and must stay
  // out of the index (M22 "genuinely localized" bar) until the drip lands.
  const translated = INDEXABLE_HUB_LOCALES.filter((l) =>
    article.available_languages.includes(l),
  );
  return applyLocaleSeo(meta, locale, `/rankings/recap/${slug}`, translated);
}

export default async function RecapArticlePage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const L = hubLexFor(locale);
  const [article, archive] = await Promise.all([
    loadRecap(slug, locale),
    loadRecapsList(locale),
  ]);
  if (!article) notFound();

  const kicker =
    article.kind === 'weekly' ? L.recaps.weeklyKicker : L.recaps.monthlyKicker;
  const periodLabel = recapPeriodLabel(
    article.kind,
    article.period_start,
    article.period_end,
    locale,
  );
  const publishedLabel = formatRefreshedAt(article.published_at, locale);
  const nameById = streamerNameMap(article.streamers);
  const { previous, next } = neighborSlugs(archive, slug);
  const url = `${SITE_URL}/rankings/recap/${slug}`;

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: L.crumbs.home, url: SITE_URL },
    { name: L.crumbs.rankings, url: `${SITE_URL}/rankings` },
    { name: article.title },
  ]);
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.teaser,
    url,
    mainEntityOfPage: url,
    inLanguage: article.language,
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    ...(article.hero.clip?.thumbnail_url ? { image: [article.hero.clip.thumbnail_url] } : {}),
    author: { '@type': 'Organization', name: 'Streamer Times', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Streamer Times', url: SITE_URL },
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(articleJsonLd) }}
      />

      <p className="text-xs font-semibold uppercase tracking-wider text-accent-cyan">
        {kicker}
        <span className="font-normal normal-case tracking-normal text-text-muted">
          {' '}
          · {periodLabel}
          {publishedLabel && ` · ${publishedLabel}`}
        </span>
      </p>
      <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">{article.title}</h1>
      <p className="mt-3 text-text-secondary">{article.teaser}</p>

      {!isRecapLocalized(article) && locale !== 'en' && (
        <p className="mt-4 rounded-lg border border-border-default bg-background-elevated px-4 py-3 text-sm text-text-muted">
          {L.recaps.translationPending}
        </p>
      )}

      {(article.hero.clip?.thumbnail_url || article.hero.streamers.length > 0) && (
        <div className="mt-6 max-w-md">
          <RecapCardVisual
            thumbnailUrl={article.hero.clip?.thumbnail_url ?? null}
            thumbnailAlt={article.hero.clip?.title ?? ''}
            streamers={article.hero.streamers.map((s) => ({
              id: s.id,
              name: s.name,
              avatarUrl: s.avatar_url,
            }))}
          />
          {article.hero.clip && (
            <p className="mt-1.5 truncate text-xs text-text-muted">
              <a
                href={article.hero.clip.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent-cyan"
              >
                {article.hero.clip.title ?? article.hero.clip.url}
              </a>
            </p>
          )}
        </div>
      )}

      {article.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-lg font-bold text-white md:text-xl">{section.heading}</h2>
          {section.paragraphs.map((paragraph, i) => (
            <p key={i} className="mt-3 leading-relaxed text-text-secondary">
              {parseRecapParagraph(paragraph, nameById).map((seg, j) =>
                seg.type === 'link' ? (
                  <Link
                    key={j}
                    href={localeHref(locale, `/streamer/${encodeURIComponent(seg.streamerId)}`)}
                    className="font-medium text-accent-cyan hover:text-text-primary"
                  >
                    {seg.name}
                  </Link>
                ) : (
                  <span key={j}>{seg.text}</span>
                ),
              )}
            </p>
          ))}
        </section>
      ))}

      <nav className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-divider pt-6 text-sm">
        {previous && (
          <Link
            href={localeHref(locale, recapHref(previous.slug))}
            className="text-accent-cyan hover:text-text-primary"
          >
            ← {L.recaps.previousEdition}
          </Link>
        )}
        {next && (
          <Link
            href={localeHref(locale, recapHref(next.slug))}
            className="text-accent-cyan hover:text-text-primary"
          >
            {L.recaps.nextEdition} →
          </Link>
        )}
        <Link
          href={localeHref(locale, '/rankings/recap')}
          className="text-accent-cyan hover:text-text-primary"
        >
          {L.recaps.allRecaps}
        </Link>
        <Link
          href={localeHref(locale, '/rankings')}
          className="text-accent-cyan hover:text-text-primary"
        >
          {L.recaps.backToRankings}
        </Link>
      </nav>
    </main>
  );
}
