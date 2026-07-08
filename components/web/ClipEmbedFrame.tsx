'use client';

import { useSyncExternalStore } from 'react';

// window.location.hostname never changes during a page's lifetime — the
// store only exists to read it hydration-safely (null on the server pass).
const subscribeNoop = () => () => {};
const getHostname = () => window.location.hostname;
const getServerHostname = () => null;

/**
 * Official Twitch clip embed (M18 Phase 1). The `parent` parameter must name
 * the domain serving THIS page — read from window.location.hostname so the
 * same component works on streamertimes.tv, www, previews, and localhost.
 * Renders an empty box during SSR, the iframe after hydration.
 */
export function ClipEmbedFrame({
  slug,
  autoplay = true,
  muted = false,
  className,
}: {
  slug: string;
  autoplay?: boolean;
  muted?: boolean;
  className?: string;
}) {
  const hostname = useSyncExternalStore(subscribeNoop, getHostname, getServerHostname);

  if (!hostname) {
    return <div className={className} aria-hidden />;
  }

  const src =
    `https://clips.twitch.tv/embed?clip=${encodeURIComponent(slug)}` +
    `&parent=${encodeURIComponent(hostname)}` +
    `&autoplay=${autoplay}&muted=${muted}`;

  return (
    <iframe
      src={src}
      className={className}
      allow="autoplay; fullscreen"
      allowFullScreen
      title="Twitch clip player"
    />
  );
}
