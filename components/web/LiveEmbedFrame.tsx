'use client';

import { useSyncExternalStore } from 'react';

// window.location.hostname never changes during a page's lifetime — the
// store only exists to read it hydration-safely (null on the server pass).
const subscribeNoop = () => () => {};
const getHostname = () => window.location.hostname;
const getServerHostname = () => null;

/**
 * Official Twitch LIVE player embed (M18 Phase 6). Same parent mechanism as
 * ClipEmbedFrame — the `parent` parameter names the domain serving THIS page,
 * so the component works on prod/www/previews/localhost and inside the app's
 * WebView (which loads the hosted page, not the iframe directly).
 */
export function LiveEmbedFrame({
  login,
  muted = false,
  className,
}: {
  login: string;
  muted?: boolean;
  className?: string;
}) {
  const hostname = useSyncExternalStore(subscribeNoop, getHostname, getServerHostname);

  if (!hostname) {
    return <div className={className} aria-hidden />;
  }

  const src =
    `https://player.twitch.tv/?channel=${encodeURIComponent(login)}` +
    `&parent=${encodeURIComponent(hostname)}` +
    `&muted=${muted}&autoplay=true`;

  return (
    <iframe
      src={src}
      className={className}
      allow="autoplay; fullscreen"
      allowFullScreen
      title={`${login} live on Twitch`}
    />
  );
}
