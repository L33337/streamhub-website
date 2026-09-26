// Shared visual tokens of the social cards — the OG design system (dark
// canvas, glow, corner brackets, STREAMERTIMES.TV footer) at 1080×1350.

import type { CSSProperties } from 'react';
import type { CardAccent, TitleSegment } from './types';

export const BG = '#0A0A0F';
export const TEXT = '#FFFFFF';
export const MUTED = '#A0A0B0';
export const DIM = '#7A7A90';
export const FAINT = '#55556A';

export const ACCENT_HEX: Record<CardAccent, string> = {
  cyan: '#00F0FF',
  green: '#3DFF9A',
  gold: '#FFC93C',
  magenta: '#FF00AA',
};

export function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function glow(accent: CardAccent, y = '38%'): string {
  return `radial-gradient(circle at 50% ${y}, ${rgba(ACCENT_HEX[accent], 0.12)} 0%, rgba(10,10,15,0) 58%)`;
}

export const CANVAS: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: BG,
  color: TEXT,
  fontFamily: 'Inter',
  padding: '96px 88px 88px 88px',
  position: 'relative',
};

const CORNER = (props: CSSProperties): CSSProperties => ({
  position: 'absolute',
  width: 44,
  height: 44,
  display: 'flex',
  ...props,
});

/** The four corner brackets: cyan top, magenta bottom (site-wide OG signature). */
export function corners(): CSSProperties[] {
  const c = 'rgba(0,240,255,0.5)';
  const m = 'rgba(255,0,170,0.5)';
  return [
    CORNER({ top: 56, left: 56, borderTop: `3px solid ${c}`, borderLeft: `3px solid ${c}` }),
    CORNER({ top: 56, right: 56, borderTop: `3px solid ${c}`, borderRight: `3px solid ${c}` }),
    CORNER({ bottom: 56, left: 56, borderBottom: `3px solid ${m}`, borderLeft: `3px solid ${m}` }),
    CORNER({ bottom: 56, right: 56, borderBottom: `3px solid ${m}`, borderRight: `3px solid ${m}` }),
  ];
}

/** Splits "Streamer Times · Week 38 · Sep 14 – 20, 2026" around the accented part. */
export function eyebrowParts(eyebrow: string, accent: string): Array<{ text: string; accent: boolean }> {
  const i = accent ? eyebrow.indexOf(accent) : -1;
  if (i < 0) return [{ text: eyebrow, accent: false }];
  return [
    { text: eyebrow.slice(0, i), accent: false },
    { text: accent, accent: true },
    { text: eyebrow.slice(i + accent.length), accent: false },
  ].filter((p) => p.text.length > 0);
}

export function titleLineText(line: TitleSegment[]): string {
  return line.map((s) => s.text).join('');
}
