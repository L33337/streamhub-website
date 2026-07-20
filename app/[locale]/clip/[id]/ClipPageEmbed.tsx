'use client';

import { useSearchParams } from 'next/navigation';
import { ClipEmbedFrame } from '@/components/web/ClipEmbedFrame';

/**
 * Client half of the hosted clip page: reads autoplay/muted from the query
 * string (the app WebView passes them) without opting the page shell out of
 * static rendering.
 */
export function ClipPageEmbed({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const autoplay = searchParams.get('autoplay') !== 'false';
  const muted = searchParams.get('muted') === 'true';

  return (
    <ClipEmbedFrame
      slug={slug}
      autoplay={autoplay}
      muted={muted}
      className="aspect-video w-full max-w-5xl border-0"
    />
  );
}
