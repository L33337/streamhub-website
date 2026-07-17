import type { Metadata } from 'next';
import { buildLeaderboardMetadata, LeaderboardPage } from '../leaderboard';

export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return buildLeaderboardMetadata('most-watched');
}

export default function MostWatchedPage() {
  return <LeaderboardPage slug="most-watched" />;
}
