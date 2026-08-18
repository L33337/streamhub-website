import { ImageResponse } from 'next/og';
import { getPartnerApi } from '@/lib/server/partner-api';
import { initialsFromName } from '@/components/web/InitialsAvatar';
import { avatarLargeUrl, displayAge, formatRegion, formatUsdRange } from '@/lib/wiki';

// M26 image round: own OG card for the wiki pages (no segment inheritance in
// Next 16 — without this file the wiki URLs ship no og:image at all). Visual
// system mirrors ../opengraph-image.tsx (streamer schedule card); the pills
// carry the wiki's headline facts instead of platforms.
export const runtime = 'nodejs';
export const revalidate = 3600;
export const alt = 'Streamer wiki profile on Streamer Times';
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

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const api = getPartnerApi();
  const [streamer, wiki] = await Promise.all([
    api.getStreamer(slug, { revalidate: 3600 }).catch(() => null),
    api.getStreamerWiki(slug, { revalidate: 3600 }).catch(() => null),
  ]);

  const name = streamer?.name ?? slug;
  const avatarUrl = avatarLargeUrl(streamer?.avatar_url ?? null);
  const initials = initialsFromName(name);

  // Headline facts as pills — EN axis (OG cards are single-language), at most
  // three, degrade to a generic pill when the profile carries none of them.
  const byKey = new Map((wiki?.facts ?? []).map((f) => [f.key, f]));
  const pills: string[] = [];
  const birth = byKey.get('birth_date');
  if (birth) {
    const age = displayAge(birth.value, new Date());
    if (age !== null) pills.push(`Age ${age}`);
  }
  const nationality = byKey.get('nationality');
  if (nationality) pills.push(formatRegion(nationality.value, 'en'));
  const income = byKey.get('est_income_monthly_usd');
  if (income && income.value_num_low !== null) {
    pills.push(`${formatUsdRange(income.value_num_low, income.value_num_high, 'en')}/mo est.`);
  }
  if (pills.length === 0) pills.push('Facts · Career · Earnings');

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
              Streamer Times · Wiki
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
              {pills.map((label) => (
                <div
                  key={label}
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
                  {label}
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: 22,
                color: '#A0A0B0',
                marginTop: 28,
                display: 'flex',
              }}
            >
              Facts &middot; Career &middot; Estimated earnings &middot; Sources
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
