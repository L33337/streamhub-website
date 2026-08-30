import { ImageResponse } from 'next/og';
import { renderOgFrame, OG_SIZE, type OgPill, ogCacheHeaders } from '@/lib/og/frame';
import { loadClimbersData } from '@/lib/server/climbers';
import { topClimber, topClimbersAcrossMetrics } from '@/lib/rankings-climbers';

// OG card for the weekly climbers recap: the biggest climb as the lead line,
// the top 3 climbs (across all metrics, deduped by streamer) as pills.
// nodejs so PARTNER_API_KEY reaches the route in `next dev` (hub-image
// convention); loadClimbersData never throws (build-abort rule).
export const runtime = 'nodejs';
export const revalidate = 300;
const alt = 'Biggest climbers this week — streamer ranking movers on Streamer Times';
const size = { width: 1200, height: 630 };
const contentType = 'image/png';

// ISR needs this (2026-08-29): an OG route under [locale] that exports only
// revalidate still renders per request; with generateImageMetadata Next builds
// it as …/opengraph-image/[__metadata_id__] and caches it (AGENTS.md "OG image routes").
export function generateImageMetadata() {
  return [{ id: 'og', alt, size, contentType }];
}

const PILL_STYLE: Omit<OgPill, 'label'> = {
  color: '#00FF88',
  bg: 'rgba(0,255,136,0.08)',
  border: 'rgba(0,255,136,0.3)',
};

function shortName(name: string): string {
  return name.length > 20 ? `${name.slice(0, 19)}…` : name;
}

export default async function Image() {
  const { movers } = await loadClimbersData();
  const best = topClimber(movers);
  const pills = topClimbersAcrossMetrics(movers, 3).map((c) => ({
    label: `▲${c.delta} ${shortName(c.entry.streamer.name)}`,
    ...PILL_STYLE,
  }));
  return new ImageResponse(
    renderOgFrame({
      eyebrow: 'Streamer Rankings',
      title: 'Biggest climbers this week',
      subtitle: best
        ? `${best.climber.entry.streamer.name} climbed ${best.climber.delta} places in ${best.movers.spec.h1.toLowerCase()}`
        : 'Weekly movers across the streamer leaderboards',
      pills,
    }),
    { ...OG_SIZE, headers: ogCacheHeaders(revalidate) },
  );
}
