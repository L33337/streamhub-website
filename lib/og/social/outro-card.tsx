import type { ReactElement } from 'react';
import { ACCENT_HEX, BG, corners, DIM, MUTED, rgba, TEXT } from './theme';

// Closing frame of the weekly video (1080×1920, M27 Phase 3): wordmark, the
// one line that says what the account is, and the domain. No week, no number:
// the frame is the same every week, so nothing here can go stale or wrong.

export const OUTRO_LINES = {
  eyebrow: 'EVERY WEEK',
  title: ['Streamer', 'Times'],
  claim: 'Twitch stats, records and moments',
  domain: 'streamertimes.tv',
} as const;

export function OutroCard(): ReactElement {
  const cyan = ACCENT_HEX.cyan;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BG,
        backgroundImage: `radial-gradient(circle at 50% 46%, ${rgba(cyan, 0.16)} 0%, rgba(10,10,15,0) 60%)`,
        color: TEXT,
        fontFamily: 'Inter',
        position: 'relative',
      }}
    >
      {corners().map((style, i) => (
        <div key={i} style={style} />
      ))}
      <div style={{ display: 'flex', fontSize: 30, letterSpacing: '0.3em', color: cyan, fontWeight: 700 }}>{OUTRO_LINES.eyebrow}</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 36 }}>
        {OUTRO_LINES.title.map((line) => (
          <div key={line} style={{ display: 'flex', fontSize: 148, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.0 }}>
            {line}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', fontSize: 40, color: MUTED, marginTop: 44 }}>{OUTRO_LINES.claim}</div>
      <div
        style={{
          display: 'flex',
          marginTop: 84,
          padding: '22px 48px',
          borderRadius: 999,
          border: `3px solid ${rgba(cyan, 0.7)}`,
          fontSize: 44,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: TEXT,
        }}
      >
        {OUTRO_LINES.domain}
      </div>
      <div style={{ display: 'flex', position: 'absolute', bottom: 120, fontSize: 24, letterSpacing: '0.22em', color: DIM }}>STREAMERTIMES.TV</div>
    </div>
  );
}
