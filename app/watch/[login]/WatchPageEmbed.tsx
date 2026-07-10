'use client';

import { useSearchParams } from 'next/navigation';
import { LiveEmbedFrame } from '@/components/web/LiveEmbedFrame';

/**
 * Client half of the hosted live page: reads muted from the query string
 * (the app zapping mode passes it) without opting the shell out of static
 * rendering.
 */
export function WatchPageEmbed({ login }: { login: string }) {
  const searchParams = useSearchParams();
  const muted = searchParams.get('muted') === 'true';

  return <LiveEmbedFrame login={login} muted={muted} className="h-full w-full border-0" />;
}
