import { ImageResponse } from 'next/og';
import { ogCacheHeaders } from '@/lib/og/frame';
import { getPartnerApi } from '@/lib/server/partner-api';
import { initialsFromName } from '@/components/web/InitialsAvatar';

// Edge runtime would not let us read PARTNER_API_KEY through process.env in
// local `next dev` without extra config — Node lets the env reach the route
// directly and the static `<img>` fetch in ImageResponse still works the same.
export const runtime = 'nodejs';
// ISR instead of per-request Satori: without `revalidate` AND
// `generateImageMetadata` this route ran on every hit — 1,943 uncached renders
// in 28 h, 7.6 % of all function invocations (2026-08-29 health check). The
// game/insights OG routes, which export both, are cached; this now mirrors
// them. 1 h: name/platforms/avatar move slower than that.
export const revalidate = 3600;
const OG_SIZE = { width: 1200, height: 630 };

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateImageMetadata({ params }: Props) {
  // Next probes this route during build page-data collection with empty
  // params — guard so the probe never throws (build-abort rule).
  const { slug } = (await params) ?? {};
  const label = typeof slug === 'string' && slug.length > 0 ? slug : 'Streamer';
  return [
    {
      id: 'og',
      alt: `${label} stream schedule on Streamer Times`,
      size: OG_SIZE,
      contentType: 'image/png',
    },
  ];
}

const CORNER = (props: React.CSSProperties): React.CSSProperties => ({
  position: 'absolute',
  width: 40,
  height: 40,
  display: 'flex',
  ...props,
});

const PLATFORM_COLORS: Record<string, { bg: string }> = {
  twitch: { bg: '#9146FF' },
  youtube: { bg: '#FF0033' },
};

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  let streamer;
  try {
    streamer = await getPartnerApi().getStreamer(slug);
  } catch {
    streamer = null;
  }

  const name = streamer?.name ?? slug;
  const platforms = streamer?.platforms ?? [];
  const avatarUrl = streamer?.avatar_url ?? null;
  const initials = initialsFromName(name);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0A0F',
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(0,240,255,0.08) 0%, transparent 60%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={CORNER({
            top: 60,
            left: 60,
            borderTop: '3px solid rgba(0,240,255,0.5)',
            borderLeft: '3px solid rgba(0,240,255,0.5)',
          })}
        />
        <div
          style={CORNER({
            top: 60,
            right: 60,
            borderTop: '3px solid rgba(0,240,255,0.5)',
            borderRight: '3px solid rgba(0,240,255,0.5)',
          })}
        />
        <div
          style={CORNER({
            bottom: 60,
            left: 60,
            borderBottom: '3px solid rgba(255,0,170,0.5)',
            borderLeft: '3px solid rgba(255,0,170,0.5)',
          })}
        />
        <div
          style={CORNER({
            bottom: 60,
            right: 60,
            borderBottom: '3px solid rgba(255,0,170,0.5)',
            borderRight: '3px solid rgba(255,0,170,0.5)',
          })}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 48,
            padding: '0 80px',
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              width={200}
              height={200}
              style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                border: '4px solid rgba(0,240,255,0.5)',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                border: '4px solid rgba(0,240,255,0.5)',
                backgroundColor: '#12121A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 80,
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              {initials}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 700 }}>
            <div
              style={{
                fontSize: 24,
                color: '#7A7A90',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                display: 'flex',
              }}
            >
              Streamer Times
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                marginTop: 8,
                lineHeight: 1.05,
                display: 'flex',
              }}
            >
              {name}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              {platforms.map((p) => {
                const c = PLATFORM_COLORS[p] ?? PLATFORM_COLORS.twitch;
                return (
                  <div
                    key={p}
                    style={{
                      display: 'flex',
                      padding: '8px 20px',
                      borderRadius: 999,
                      backgroundColor: c.bg,
                      color: '#FFFFFF',
                      fontSize: 22,
                      fontWeight: 700,
                      textTransform: 'capitalize',
                    }}
                  >
                    {p}
                  </div>
                );
              })}
              {platforms.length === 0 && (
                <div
                  style={{
                    display: 'flex',
                    padding: '8px 20px',
                    borderRadius: 999,
                    border: '1px solid rgba(0,240,255,0.3)',
                    backgroundColor: 'rgba(0,240,255,0.08)',
                    color: '#00F0FF',
                    fontSize: 22,
                    fontWeight: 600,
                  }}
                >
                  Live Stream Guide
                </div>
              )}
            </div>
            <div
              style={{
                fontSize: 22,
                color: '#A0A0B0',
                marginTop: 28,
                display: 'flex',
              }}
            >
              Live status &middot; Upcoming schedule &middot; AI predictions
            </div>
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
    ),
    { ...OG_SIZE, headers: ogCacheHeaders(revalidate) },
  );
}
