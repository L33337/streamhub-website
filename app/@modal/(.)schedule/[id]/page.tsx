import { notFound } from 'next/navigation';
import { getPartnerApi } from '@/lib/server/partner-api';
import { SlotDetailModal } from '@/components/web/SlotDetailModal';
import { StreamSlotDetail } from '@/components/web/StreamSlotDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InterceptedSlotPage({ params }: Props) {
  const { id } = await params;
  const slot = await getPartnerApi().getSchedule(id, { revalidate: 60 });
  if (!slot) notFound();

  return (
    <SlotDetailModal>
      <StreamSlotDetail slot={slot} />
    </SlotDetailModal>
  );
}
