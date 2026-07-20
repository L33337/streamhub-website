import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPartnerApi } from '@/lib/server/partner-api';
import { expiredPredictionStreamerSlug } from '@/lib/prediction-redirect';
import { buildBreadcrumbJsonLd, streamerCanonicalUrl } from '@/lib/seo';
import { StreamSlotDetail } from '@/components/web/StreamSlotDetail';
import { BackLink } from '@/components/web/BackLink';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';

export const revalidate = 60;

// Required for ISR: without generateStaticParams, Next renders this dynamic
// route per-request (ƒ in the build output) and never caches the HTML — every
// visitor paid a full server render (Cache-Control: private, no-store). An
// empty array means no ids are prerendered at build time — each is generated
// on first visit, then served from the route cache per `revalidate`
// (dynamicParams defaults to true). notFound() and the expired-prediction
// permanentRedirect are cached the same way (real 404/308 responses).
export function generateStaticParams(): Array<{ id: string }> {
  return [];
}

// Wrapped in React `cache()` so generateMetadata and the page component share
// a single fetch per request. Load-bearing: the partner-api client always
// passes an AbortSignal, which opts the fetch out of Next's built-in request
// dedupe — without cache() this page fired two identical getSchedule calls.
const loadSlot = cache((id: string) => getPartnerApi().getSchedule(id, { revalidate: 60 }));

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

// Slot pages are ephemeral (ai_slot_pred_* ids churn with every prediction
// cycle, real slots expire after the stream) and near-duplicates of the
// streamer page — keep all of them out of the index. Since 2026-07-15
// robots.txt disallows /schedule/ for Googlebot only (the churned ids burned
// ~500 crawls/day as GSC "Page with redirect" entries); the * group stays
// open so Discord/Twitter embed crawlers still fetch the OG tags of shared
// slot URLs. This noindex stays as defense-in-depth for every crawler that
// does reach the page (Bing, robots.txt-ignoring bots).
const SLOT_ROBOTS = { index: false, follow: true } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const slot = await loadSlot(id);
  if (!slot) {
    return { title: 'Stream not found — Streamer Times', robots: SLOT_ROBOTS };
  }
  const verb = slot.status === 'live' ? 'is live' : 'streams';
  const platformsText = slot.platforms.length > 0 ? slot.platforms.join(' & ') : 'live';
  return {
    title: `${slot.streamer_name} ${verb}: ${slot.title} | Streamer Times`,
    description: slot.category
      ? `${slot.streamer_name} streaming ${slot.category} on ${platformsText}.`
      : `${slot.streamer_name} on ${platformsText}.`,
    robots: SLOT_ROBOTS,
    openGraph: {
      title: `${slot.streamer_name} — ${slot.title}`,
      images: slot.thumbnail_url ? [slot.thumbnail_url] : undefined,
    },
  };
}

export default async function SlotPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const slot = await loadSlot(id);
  if (!slot) {
    // Expired AI prediction → the id encodes the streamer; send crawlers and
    // stale links to the streamer page (308) instead of a dead 404.
    const slug = expiredPredictionStreamerSlug(id);
    if (slug) permanentRedirect(localeHref(locale, `/streamer/${slug}`));
    notFound();
  }

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: 'https://streamertimes.tv' },
    { name: 'Streamers', url: 'https://streamertimes.tv/streamers' },
    {
      name: slot.streamer_name,
      url: streamerCanonicalUrl(slot.streamer_id),
    },
    { name: slot.title },
  ]);

  return (
    <main className="container mx-auto max-w-3xl px-6 pb-16 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <BackLink />
      <StreamSlotDetail slot={slot} language={locale} />
    </main>
  );
}
