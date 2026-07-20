import { notFound, permanentRedirect } from 'next/navigation';
import { getPartnerApi } from '@/lib/server/partner-api';
import { expiredPredictionStreamerSlug } from '@/lib/prediction-redirect';
import { SlotDetailModal } from '@/components/web/SlotDetailModal';
import { StreamSlotDetail } from '@/components/web/StreamSlotDetail';
import { isUiLang, localeHref, type UiLang } from '@/lib/i18n-core';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function InterceptedSlotPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const slot = await getPartnerApi().getSchedule(id, { revalidate: 60 });
  if (!slot) {
    // Same expired-prediction redirect as the full page — a modal for a
    // just-expired slot navigates to the streamer page instead of a 404.
    const slug = expiredPredictionStreamerSlug(id);
    if (slug) permanentRedirect(localeHref(locale, `/streamer/${slug}`));
    notFound();
  }

  return (
    <SlotDetailModal>
      <StreamSlotDetail slot={slot} language={locale} />
    </SlotDetailModal>
  );
}
