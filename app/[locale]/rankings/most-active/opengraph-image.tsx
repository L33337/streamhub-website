import { buildLeaderboardOgImage } from '@/lib/og/leaderboard';

// Thin wrapper — see lib/og/leaderboard.tsx. nodejs so PARTNER_API_KEY
// reaches the route in `next dev` (hub-image convention).
export const runtime = 'nodejs';
export const revalidate = 300;
export const alt = 'Most active streamers — ranking on StreamerTimes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return buildLeaderboardOgImage('most-active');
}
