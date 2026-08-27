import { ImageResponse } from 'next/og';
import { renderOgFrame, OG_SIZE } from '@/lib/og/frame';

// Own OG image (no segment inheritance in Next 16). Fully static — no data
// fetch, nothing that can throw during prerender.
export const runtime = 'nodejs';

export const alt = 'How predictions and confidence levels work on Streamer Times';
export const size = OG_SIZE;
export const contentType = 'image/png';

// Confidence palette from app/globals.css (--color-confidence-*), inlined:
// Satori has no access to CSS variables.
const PILLS = [
  { label: 'HIGH', color: '#00FF88', bg: 'rgba(0,255,136,0.15)', border: 'rgba(0,255,136,0.4)' },
  { label: 'MEDIUM', color: '#FFB800', bg: 'rgba(255,184,0,0.15)', border: 'rgba(255,184,0,0.4)' },
  { label: 'LOW', color: '#FF3366', bg: 'rgba(255,51,102,0.15)', border: 'rgba(255,51,102,0.4)' },
];

export default function Image() {
  return new ImageResponse(
    renderOgFrame({
      title: 'How we predict when streamers go live',
      subtitle: 'Broadcast history · announced schedules · what streamers say on stream',
      pills: PILLS,
    }),
    { ...OG_SIZE },
  );
}
