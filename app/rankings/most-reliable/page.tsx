import type { Metadata } from 'next';
import { buildLeaderboardMetadata, LeaderboardPage } from '../leaderboard';

// 300 (not 3600): the LIVE badges need a fresh live set; the ranking fetch
// itself stays data-cached for an hour (see leaderboard.tsx loadRanking).
export const revalidate = 300;

export function generateMetadata(): Promise<Metadata> {
  return buildLeaderboardMetadata('most-reliable');
}

export default function MostReliablePage() {
  return <LeaderboardPage slug="most-reliable" />;
}
