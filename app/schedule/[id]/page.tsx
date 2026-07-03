import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPartnerApi } from '@/lib/server/partner-api';
import { buildBreadcrumbJsonLd, streamerCanonicalUrl } from '@/lib/seo';
import { StreamSlotDetail } from '@/components/web/StreamSlotDetail';
import { BackLink } from '@/components/web/BackLink';

export const revalidate = 60;

interface Props {
  params: Promise<{ id: string }>;
}

// Slot pages are ephemeral (ai_slot_pred_* ids churn with every prediction
// cycle, real slots expire after the stream) and near-duplicates of the
// streamer page — keep all of them out of the index. follow:true keeps the
// links to /streamer/[slug] crawlable; robots.txt deliberately does NOT
// disallow /schedule/ so crawlers can see this noindex.
const SLOT_ROBOTS = { index: false, follow: true } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const slot = await getPartnerApi().getSchedule(id, { revalidate: 60 });
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
  const { id } = await params;
  const slot = await getPartnerApi().getSchedule(id, { revalidate: 60 });
  if (!slot) notFound();

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
      <StreamSlotDetail slot={slot} />
    </main>
  );
}
