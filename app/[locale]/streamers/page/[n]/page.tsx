import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StreamersIndexView, pageCanonical } from '@/components/web/StreamersIndexView';
import { isUiLang, type UiLang } from '@/lib/i18n-core';
import { applyLocaleSeo, INDEXABLE_HUB_LOCALES } from '@/lib/seo';

export const revalidate = 300;

// On-demand ISR, same convention as the streamer pages: no page is prerendered
// at build time; each is generated on first visit and cached per `revalidate`.
export function generateStaticParams(): Array<{ n: string }> {
  return [];
}

interface Props {
  params: Promise<{ locale: string; n: string }>;
}

/** Parse a page segment. Only integers >= 2 are valid — page 1 lives at
 *  /streamers, so /streamers/page/1 must 404 (no duplicate URL for page 1). */
function parsePage(n: string): number | null {
  if (!/^[0-9]+$/.test(n)) return null;
  const p = Number(n);
  return Number.isSafeInteger(p) && p >= 2 ? p : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, n } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const page = parsePage(n);
  if (page === null) return { title: 'Streamers — Streamer Times' };
  const meta: Metadata = {
    title: `All Streamers A–Z (Page ${page}) — Twitch & YouTube | Streamer Times`,
    description: `Page ${page} of every Twitch and YouTube streamer tracked on Streamer Times, A to Z, with live status and AI-predicted next streams.`,
    // Self-canonical per Google's pagination guidance (do NOT canonicalize to
    // page 1). Indexable + follow so both the list content and the streamer
    // links on it stay in the crawl graph.
    alternates: { canonical: pageCanonical(page) },
    robots: { index: true, follow: true },
  };
  return applyLocaleSeo(meta, locale, `/streamers/page/${page}`, INDEXABLE_HUB_LOCALES);
}

export default async function StreamersPaginatedPage({ params }: Props) {
  const { locale: rawLocale, n } = await params;
  const locale: UiLang = isUiLang(rawLocale) ? rawLocale : 'en';
  const page = parsePage(n);
  if (page === null) notFound();
  // StreamersIndexView 404s when `page` exceeds the real page count.
  return <StreamersIndexView page={page} locale={locale} />;
}
