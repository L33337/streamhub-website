import type { Metadata } from 'next';
import { TwitchImportReturn } from '@/components/web/twitch-import/TwitchImportReturn';

// Redirect target of the Twitch implicit-grant follows-import flow
// (lib/web/twitchConnect.ts → Twitch → here). Like /auth/login it lives under
// [locale] so the root layout wraps it; middleware rewrites the unprefixed
// /auth/twitch-import into the English tree. The transient page is locale-
// agnostic (one status line) — it bounces straight back to the stored `next`,
// which preserves the caller's locale. All work runs client-side in
// <TwitchImportReturn /> because Twitch returns the token in the URL fragment.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Finishing Twitch import… | Streamer Times',
  robots: { index: false, follow: false },
};

export default function TwitchImportReturnPage() {
  return <TwitchImportReturn />;
}
