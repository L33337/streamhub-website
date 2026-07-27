// Pure props builder for the per-metric leaderboard OG cards — separated from
// lib/og/leaderboard.tsx (which pulls in the server-only Partner API client)
// so vitest can import it (same layering rule as lib/rankings.ts).

import type { PublicRankingEntry } from '@/lib/server/partner-api';
import type { OgFrameOptions, OgPill } from '@/lib/og/frame';
import type { RankingPageSpec } from '@/lib/rankings';

const MEDAL_STYLES: ReadonlyArray<Omit<OgPill, 'label'>> = [
  { color: '#FFD700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.4)' },
  { color: '#C0C0C0', bg: 'rgba(192,192,192,0.08)', border: 'rgba(192,192,192,0.4)' },
  { color: '#CD7F32', bg: 'rgba(205,127,50,0.10)', border: 'rgba(205,127,50,0.45)' },
];

/** Three pills at fontSize 22 share ~1040px — keep long display names sane. */
export function shortOgName(name: string): string {
  return name.length > 20 ? `${name.slice(0, 19)}…` : name;
}

/**
 * First sentence of the spec's meta description — with a #1 entry that is the
 * "{name} leads with {value}" line; without one it degrades to the count-free
 * methodology opener (same honesty rule as the page titles).
 */
function firstSentence(text: string): string {
  const i = text.indexOf('. ');
  return i === -1 ? text : text.slice(0, i);
}

/** Pure props builder (unit-tested). Expects SANITIZED entries. */
export function leaderboardOgProps(
  spec: RankingPageSpec,
  entries: PublicRankingEntry[],
): OgFrameOptions {
  const top3 = entries.slice(0, 3);
  return {
    eyebrow: 'Streamer Rankings',
    title: spec.h1,
    subtitle: firstSentence(spec.buildDescription(top3[0])),
    pills: top3.map((e, i) => ({
      label: `#${e.rank} ${shortOgName(e.streamer.name)}`,
      ...MEDAL_STYLES[i],
    })),
  };
}
