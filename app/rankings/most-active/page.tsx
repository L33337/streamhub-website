import type { Metadata } from 'next';
import { buildLeaderboardMetadata, LeaderboardPage } from '../leaderboard';

export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return buildLeaderboardMetadata('most-active');
}

export default function MostActivePage() {
  return <LeaderboardPage slug="most-active" />;
}
