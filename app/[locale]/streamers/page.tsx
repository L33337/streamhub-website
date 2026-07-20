import type { Metadata } from 'next';
import { StreamersIndexView, pageCanonical } from '@/components/web/StreamersIndexView';
import { isUiLang, type UiLang } from '@/lib/i18n-core';
import { siteMetaFor } from '@/lib/i18n-sitemeta';
import { applyLocaleSeo, INDEXABLE_HUB_LOCALES } from '@/lib/seo';

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const localized = siteMetaFor(locale).streamers;
  const meta: Metadata = {
    title:
      locale === 'en'
        ? 'All Streamers A–Z — Twitch & YouTube Live Schedules | StreamerTimes'
        : localized.title,
    description:
      locale === 'en'
        ? 'Browse every Twitch and YouTube streamer tracked on Streamer Times, A to Z. See who is live now, upcoming schedules, and AI-predicted next streams.'
        : localized.description,
    alternates: { canonical: pageCanonical(1) },
    openGraph: {
      title:
        locale === 'en' ? 'All Streamers A–Z — Twitch & YouTube Live Schedules' : localized.title,
      description:
        locale === 'en'
          ? 'Every Twitch and YouTube streamer tracked on Streamer Times, A to Z, with live status and AI-powered schedule predictions.'
          : localized.description,
      url: pageCanonical(1),
      siteName: 'Streamer Times',
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
  return applyLocaleSeo(meta, locale, '/streamers', INDEXABLE_HUB_LOCALES);
}

export default async function StreamersIndexPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  return <StreamersIndexView page={1} locale={locale} />;
}
