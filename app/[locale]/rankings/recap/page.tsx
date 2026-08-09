import type { Metadata } from 'next';
import Link from 'next/link';
import {
  applyLocaleSeo,
  buildBreadcrumbJsonLd,
  INDEXABLE_HUB_LOCALES,
  jsonLdHtml,
} from '@/lib/seo';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';
import { hubLexFor } from '@/lib/i18n-hub';
import { recapHref, recapPeriodLabel } from '@/lib/recaps';
import { loadRecapsList } from '@/lib/server/recaps';
import { RecapTeaserCard } from '@/components/web/rankings/RecapTeaserCard';

// Archive of all published recap editions (2026-08-09). Grows by one page-less
// list entry per week + month; localized chrome, per-locale article teasers
// from the partner API (EN fallback per item). 15-min ISR like the articles.
export const revalidate = 900;

const SITE_URL = 'https://streamertimes.tv';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const L = hubLexFor(locale);
  const items = await loadRecapsList(locale);
  const url = `${SITE_URL}/rankings/recap`;
  const meta: Metadata = {
    title:
      locale === 'en'
        ? 'Streamer Recap Archive — Weekly & Monthly Ranking Highlights'
        : L.recaps.archiveTitle,
    description: L.recaps.archiveIntro,
    alternates: { canonical: url },
    openGraph: {
      title: locale === 'en' ? 'Streamer Recap Archive' : L.recaps.archiveTitle,
      description: L.recaps.archiveIntro,
      url,
      siteName: 'Streamer Times',
      type: 'website',
    },
  };
  // Thin-content gate: nothing published yet (cold start / API failure) —
  // render the warming state but stay out of the index until there is content.
  if (items.length === 0) {
    meta.robots = { index: false, follow: true };
  }
  return applyLocaleSeo(meta, locale, '/rankings/recap', INDEXABLE_HUB_LOCALES);
}

export default async function RecapArchivePage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const L = hubLexFor(locale);
  const items = await loadRecapsList(locale);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: L.crumbs.home, url: SITE_URL },
    { name: L.crumbs.rankings, url: `${SITE_URL}/rankings` },
    { name: L.recaps.archiveTitle },
  ]);
  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Streamer Recap Archive',
    url: `${SITE_URL}/rankings/recap`,
    hasPart: items.slice(0, 24).map((i) => ({
      '@type': 'Article',
      name: i.title,
      url: `${SITE_URL}/rankings/recap/${i.slug}`,
    })),
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(collectionPage) }}
      />

      <h1 className="text-3xl font-bold text-white md:text-4xl">{L.recaps.archiveTitle}</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">{L.recaps.archiveIntro}</p>

      {items.length === 0 ? (
        <p className="mt-10 text-text-secondary">{L.rankings.warmingUp}</p>
      ) : (
        <div className="mt-8 grid gap-4">
          {items.map((item) => (
            <RecapTeaserCard
              key={item.slug}
              item={item}
              kicker={item.kind === 'weekly' ? L.recaps.weeklyKicker : L.recaps.monthlyKicker}
              periodLabel={recapPeriodLabel(item.kind, item.period_start, item.period_end, locale)}
              readMore={L.recaps.readMore}
              href={localeHref(locale, recapHref(item.slug))}
            />
          ))}
        </div>
      )}

      <p className="mt-12 border-t border-divider pt-6 text-sm">
        <Link
          href={localeHref(locale, '/rankings')}
          className="text-accent-cyan hover:text-text-primary"
        >
          ← {L.recaps.backToRankings}
        </Link>
      </p>
    </main>
  );
}
