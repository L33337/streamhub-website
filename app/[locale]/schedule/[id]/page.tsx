import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPartnerApi } from '@/lib/server/partner-api';
import { expiredPredictionStreamerSlug } from '@/lib/prediction-redirect';
import { buildBreadcrumbJsonLd, streamerCanonicalUrl, jsonLdHtml } from '@/lib/seo';
import { StreamSlotDetail } from '@/components/web/StreamSlotDetail';
import { BackLink } from '@/components/web/BackLink';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';

// 1800 (300 from 2026-08-03, 60 before): slot ids churn every prediction
// cycle, so most traffic here is a cold first render — but re-crawls at a
// short TTL made every hit a billed ISR write (this route was the site's top
// ISR write consumer together with /streamer/[slug]). Raised to 1800 on
// 2026-09-13: the miss outcomes (308 to the streamer page / 404) are cached
// with the SAME TTL, and Next's data cache never stores the API's 404, so a
// dead id re-crawled every ~25 min cost a render + a Partner API call each
// time — 3,500 prediction-id 404s + 860 live-id 404s per day, ids 1–12 days
// old (younger than the middleware's 21-day shortcut). The freshness cost is
// a live-status flip appearing up to 30 min late on a slot DETAIL page
// (homepage + /live keep their 60 s TTL; the streamer page is purged
// on-demand). Keep loadSlot and the @modal route at the same value — the
// lowest fetch revalidate in the tree caps the route (AGENTS.md).
export const revalidate = 1800;

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
const loadSlot = cache((id: string) => getPartnerApi().getSchedule(id, { revalidate }));

/**
 * Where a miss should send the visitor, or null for a real 404.
 *
 * Two sources, in order of reliability:
 *   1. `expiredStreamerId` from the API — authoritative, works for every slot
 *      kind including real Twitch/YouTube broadcasts.
 *   2. the slug embedded in an `ai_slot_pred_*` id — the only thing available
 *      when the row is gone entirely (deleted on a later prediction run), which
 *      is the common case for old prediction URLs.
 */
function missRedirectSlug(id: string, expiredStreamerId: string | null): string | null {
  return expiredStreamerId ?? expiredPredictionStreamerSlug(id);
}

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

// Slot pages are ephemeral (ai_slot_pred_* ids churn with every prediction
// cycle, real slots expire after the stream) and near-duplicates of the
// streamer page — keep all of them out of the index. robots.txt disallows
// /schedule/ for all named search/AI crawlers (Googlebot since 2026-07-15,
// the extended list since 2026-08-03 when the churned ids surfaced as the top
// ISR-write cost); the * group stays open so Discord/Twitter embed crawlers
// still fetch the OG tags of shared slot URLs. This noindex stays as
// defense-in-depth for every crawler that does reach the page.
const SLOT_ROBOTS = { index: false, follow: true } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { slot } = await loadSlot(id);
  if (!slot) {
    return { title: 'Stream not found — Streamer Times', robots: SLOT_ROBOTS };
  }
  const verb =
    slot.slot_kind === 'cancelled'
      ? 'is not streaming'
      : slot.status === 'live'
        ? 'is live'
        : 'streams';
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
  const { slot, expiredStreamerId } = await loadSlot(id);
  if (!slot) {
    // Expired or vanished slot → send crawlers and stale links to the streamer
    // page (308) instead of a dead 404. Covers real broadcasts too, not just
    // predictions, because the API names the streamer of an expired slot.
    const slug = missRedirectSlug(id, expiredStreamerId);
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
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumb) }}
      />
      <BackLink />
      <StreamSlotDetail slot={slot} language={locale} />
    </main>
  );
}
