import { buildLeaderboardOgImage } from '@/lib/og/leaderboard';

// Thin wrapper — see lib/og/leaderboard.tsx. nodejs so PARTNER_API_KEY
// reaches the route in `next dev` (hub-image convention).
export const runtime = 'nodejs';
export const revalidate = 300;
const alt = 'Most active streamers — ranking on Streamer Times';
const size = { width: 1200, height: 630 };
const contentType = 'image/png';

// ISR needs this (2026-08-29): an OG route under [locale] that exports only
// revalidate still renders per request; with generateImageMetadata Next builds
// it as …/opengraph-image/[__metadata_id__] and caches it (AGENTS.md "OG image routes").
export function generateImageMetadata() {
  return [{ id: 'og', alt, size, contentType }];
}

export default function Image() {
  return buildLeaderboardOgImage('most-active');
}
