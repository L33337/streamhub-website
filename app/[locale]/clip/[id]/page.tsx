import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ClipPageEmbed } from './ClipPageEmbed';

// Hosted clip player page (M18 Phase 1). Exists primarily as the Twitch
// `parent` wrapper for the APP's WebView player (a native app cannot satisfy
// the embed's HTTPS-parent requirement) — also works as a shareable URL.
// No data fetching: the slug in the URL is all the embed needs.

// Twitch clip slugs are alphanumeric with dashes/underscores.
const SLUG_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;

// Cache the (slug-parametrized) static shell like the streamer pages do —
// without generateStaticParams, Next renders dynamic routes per-request.
export function generateStaticParams(): Array<{ id: string }> {
  return [];
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: 'Clip · Streamer Times',
    robots: { index: false, follow: false },
    alternates: { canonical: `https://streamertimes.tv/clip/${id}` },
  };
}

export default async function ClipPage({ params }: Props) {
  const { id } = await params;
  if (!SLUG_PATTERN.test(id)) notFound();

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Suspense fallback={<div className="aspect-video w-full max-w-5xl bg-black" />}>
          <ClipPageEmbed slug={id} />
        </Suspense>
      </div>
      <div className="flex items-center justify-center pb-[max(env(safe-area-inset-bottom),1rem)] pt-2">
        <a
          href={`https://clips.twitch.tv/${encodeURIComponent(id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-text-secondary transition-colors hover:text-white"
        >
          Watch on Twitch
        </a>
      </div>
    </div>
  );
}
