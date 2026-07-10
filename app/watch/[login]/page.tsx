import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WatchPageEmbed } from './WatchPageEmbed';

// Hosted live player page (M18 Phase 6). Exists primarily as the Twitch
// `parent` wrapper for the APP's zapping mode (a native app cannot satisfy
// the embed's HTTPS-parent requirement) — also works as a shareable URL.
// noindex for now; a public variant is the /live SEO vision.

// Twitch logins: 3-25 chars, alphanumeric + underscore.
const LOGIN_PATTERN = /^[A-Za-z0-9_]{3,25}$/;

export function generateStaticParams(): { login: string }[] {
  return [];
}

interface Props {
  params: Promise<{ login: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { login } = await params;
  return {
    title: `${login} · Live · Streamer Times`,
    robots: { index: false, follow: false },
    alternates: { canonical: `https://streamertimes.tv/watch/${login}` },
  };
}

export default async function WatchPage({ params }: Props) {
  const { login } = await params;
  if (!LOGIN_PATTERN.test(login)) notFound();

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="min-h-0 flex-1">
        <Suspense fallback={<div className="h-full w-full bg-black" />}>
          <WatchPageEmbed login={login} />
        </Suspense>
      </div>
      <div className="flex items-center justify-center pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
        <a
          href={`https://www.twitch.tv/${encodeURIComponent(login)}`}
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
