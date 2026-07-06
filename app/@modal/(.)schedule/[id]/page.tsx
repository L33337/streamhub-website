import { notFound, permanentRedirect } from 'next/navigation';
import { getPartnerApi } from '@/lib/server/partner-api';
import { expiredPredictionStreamerSlug } from '@/lib/prediction-redirect';
import { SlotDetailModal } from '@/components/web/SlotDetailModal';
import { StreamSlotDetail } from '@/components/web/StreamSlotDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InterceptedSlotPage({ params }: Props) {
  const { id } = await params;
  const slot = await getPartnerApi().getSchedule(id, { revalidate: 60 });
  if (!slot) {
    // Same expired-prediction redirect as the full page — a modal for a
    // just-expired slot navigates to the streamer page instead of a 404.
    const slug = expiredPredictionStreamerSlug(id);
    if (slug) permanentRedirect(`/streamer/${slug}`);
    notFound();
  }

  return (
    <SlotDetailModal>
      <StreamSlotDetail slot={slot} />
    </SlotDetailModal>
  );
}
