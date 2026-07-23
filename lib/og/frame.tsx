import type { CSSProperties, ReactElement } from 'react';

// Shared branded frame for OpenGraph images (1200x630). The design system —
// dark canvas, cyan radial glow, cyan/magenta corner brackets, "Streamer Times"
// eyebrow, big title, subtitle, and the STREAMERTIMES.TV footer — mirrors
// app/streamer/[slug]/opengraph-image.tsx so every social/SERP card reads as one
// system. Returns plain JSX (runtime-agnostic); callers wrap it in
// `new ImageResponse(...)` and declare their own runtime/size/alt/contentType.

export const OG_SIZE = { width: 1200, height: 630 } as const;

const BG = '#0A0A0F';
const GLOW = 'radial-gradient(circle at 50% 50%, rgba(0,240,255,0.08) 0%, transparent 60%)';
const CYAN = 'rgba(0,240,255,0.5)';
const MAGENTA = 'rgba(255,0,170,0.5)';

const CORNER = (props: CSSProperties): CSSProperties => ({
  position: 'absolute',
  width: 40,
  height: 40,
  display: 'flex',
  ...props,
});

export interface OgPill {
  label: string;
  color?: string; // text color
  bg?: string; // background fill
  border?: string; // border color
}

export interface OgFrameOptions {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  pills?: OgPill[];
  /**
   * Optional portrait artwork (data URI — the CSP-free Satori renderer fetches
   * nothing itself) shown left of the text block, e.g. a game's Twitch box art
   * (3:4). When set, the layout switches to a two-column card with
   * left-aligned text; when absent, the classic centered layout is
   * byte-identical for every existing caller.
   */
  sideImage?: string;
}

export function renderOgFrame({
  title,
  subtitle,
  eyebrow = 'Streamer Times',
  pills = [],
  sideImage,
}: OgFrameOptions): ReactElement {
  const align: CSSProperties = sideImage
    ? { alignItems: 'flex-start', textAlign: 'left' }
    : { alignItems: 'center', textAlign: 'center' };
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
        backgroundImage: GLOW,
        color: '#FFFFFF',
        fontFamily: 'sans-serif',
        padding: '0 80px',
      }}
    >
      <div
        style={CORNER({
          top: 60,
          left: 60,
          borderTop: `3px solid ${CYAN}`,
          borderLeft: `3px solid ${CYAN}`,
        })}
      />
      <div
        style={CORNER({
          top: 60,
          right: 60,
          borderTop: `3px solid ${CYAN}`,
          borderRight: `3px solid ${CYAN}`,
        })}
      />
      <div
        style={CORNER({
          bottom: 60,
          left: 60,
          borderBottom: `3px solid ${MAGENTA}`,
          borderLeft: `3px solid ${MAGENTA}`,
        })}
      />
      <div
        style={CORNER({
          bottom: 60,
          right: 60,
          borderBottom: `3px solid ${MAGENTA}`,
          borderRight: `3px solid ${MAGENTA}`,
        })}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: sideImage ? 56 : 0,
          maxWidth: sideImage ? 1020 : 960,
        }}
      >
        {sideImage && (
          // eslint-disable-next-line @next/next/no-img-element -- Satori (ImageResponse) renders plain elements; next/image cannot run there.
          <img
            src={sideImage}
            width={270}
            height={360}
            alt=""
            style={{
              borderRadius: 16,
              border: '2px solid rgba(0,240,255,0.35)',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: align.alignItems,
            maxWidth: sideImage ? 620 : 960,
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: '#7A7A90',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: sideImage ? 58 : 68,
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              marginTop: 12,
              lineHeight: 1.05,
              textAlign: align.textAlign,
              display: 'flex',
            }}
          >
            {title}
          </div>

          {pills.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              {pills.map((p) => (
                <div
                  key={p.label}
                  style={{
                    display: 'flex',
                    padding: '8px 20px',
                    borderRadius: 999,
                    border: `1px solid ${p.border ?? 'rgba(0,240,255,0.3)'}`,
                    backgroundColor: p.bg ?? 'rgba(0,240,255,0.08)',
                    color: p.color ?? '#00F0FF',
                    fontSize: 22,
                    fontWeight: 600,
                  }}
                >
                  {p.label}
                </div>
              ))}
            </div>
          )}

          {subtitle && (
            <div
              style={{
                fontSize: 26,
                color: '#A0A0B0',
                marginTop: 28,
                textAlign: align.textAlign,
                display: 'flex',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 56,
          fontSize: 18,
          color: '#7A7A90',
          letterSpacing: '0.2em',
          display: 'flex',
        }}
      >
        STREAMERTIMES.TV
      </div>
    </div>
  );
}
