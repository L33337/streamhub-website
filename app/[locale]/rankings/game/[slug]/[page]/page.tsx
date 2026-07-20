// Deep pages of a category ranking: /rankings/game/<slug>/<n> for n >= 2.
//
// Page 1 stays on the flat /rankings/game/<slug> route so the canonical URL
// never gains a "/1" twin; the shared component rejects page 1 here (its
// parseGamePage only accepts >= 2 when a segment is present).
//
// Both routes render the SAME component and share loadGameRanking's React
// cache, so the metadata + body of one request hit the partner API once.

import type { Metadata } from 'next';
import GameRankingPage, { generateMetadata as buildMeta } from '../page';

// Matches the flat route: LIVE badges + live viewer numbers need 300s freshness.
export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string; page: string }>;
}

/**
 * Nothing prerendered at build time — page counts depend on live pool sizes,
 * and today every tracked category fits on page 1. Generated on demand instead
 * (dynamicParams defaults to true); out-of-range pages 404 in the component.
 */
export function generateStaticParams(): Array<{ slug: string; page: string }> {
  return [];
}

export function generateMetadata(props: Props): Promise<Metadata> {
  return buildMeta(props);
}

export default function GameRankingDeepPage(props: Props) {
  return GameRankingPage(props);
}
