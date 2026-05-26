import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { initialsFromName } from '@/components/web/InitialsAvatar';

// Edge runtime would not let us read PARTNER_API_KEY through process.env in
// local `next dev` without extra config — Node lets the env reach the route
// directly and the static `<img>` fetch in ImageResponse still works the same.
export const runtime = 'nodejs';
export const alt = 'Streamer schedule on StreamerTimes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: Promise<{ slug: string }>;
}

const CORNER = (props: React.CSSProperties): React.CSSProperties => ({
  position: 'absolute',
  width: 40,
  height: 40,
  display: 'flex',
  ...props,
});

const PLATFORM_COLORS: Record<string, { fg: string; border: string; bg: string }> = {
  twitch: { fg: '#B388FF', border: 'rgba(145,70,255,0.5)', bg: 'rgba(145,70,255,0.15)' },
  youtube: { fg: '#FF6680', border: 'rgba(255,0,51,0.5)', bg: 'rgba(255,0,51,0.15)' },
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
                      border: `1px solid ${c.border}`,
                      backgroundColor: c.bg,
                      color: c.fg,
                      fontSize: 22,
                      fontWeight: 600,
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
    { ...size },
  );
}
