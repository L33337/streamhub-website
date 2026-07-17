import type { Metadata } from 'next';
import { buildLeaderboardMetadata, LeaderboardPage } from '../leaderboard';

export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return buildLeaderboardMetadata('most-reliable');
}

export default function MostReliablePage() {
  return <LeaderboardPage slug="most-reliable" />;
}
