import type { ReactElement } from 'react';
import type { ListCardSpec } from './types';
import { ACCENT_HEX, CANVAS, corners, DIM, eyebrowParts, FAINT, glow, MUTED, rgba, TEXT } from './theme';

// Recap card (Post A / C): eyebrow, two-line headline with one accented
// word, subtitle, up to five ranked rows (rank · avatar · name + meta ·
// value + unit), footer. Row 1 is highlighted in the card's accent.

export interface ListCardProps {
  spec: ListCardSpec;
  /** data: URIs resolved by the route (loadOgAvatar); null → initials badge. */
  avatars: Array<string | null>;
  initials: string[];
}

export function ListCard({ spec, avatars, initials }: ListCardProps): ReactElement {
  const accent = ACCENT_HEX[spec.accent];
  const valueColor = spec.card === 'growth' ? ACCENT_HEX.green : spec.card === 'followers' || spec.card === 'milestones' ? ACCENT_HEX.gold : TEXT;
  const rowGap = spec.rows.length >= 5 ? 14 : 22;
  const rowPad = spec.rows.length >= 5 ? 16 : 22;
  // Row geometry (inner width 904): rank 56 + avatar 100 + 3 gaps × 22 + padding 2 × 30 = 282,
  // leaving 622 for name column (380, meta may wrap to a second line) + value column (≈ 242).
  const NAME_WIDTH = 380;
  return (
    <div style={{ ...CANVAS, backgroundImage: glow(spec.accent) }}>
      {corners().map((style, i) => (
        <div key={i} style={style} />
      ))}

      <div style={{ display: 'flex', fontSize: 26, letterSpacing: '0.14em', color: DIM, textTransform: 'uppercase' }}>
        {eyebrowParts(spec.eyebrow, spec.eyebrow_accent).map((p, i) => (
          <span key={i} style={{ color: p.accent ? accent : DIM, fontWeight: p.accent ? 700 : 400, whiteSpace: 'pre' }}>
            {p.text}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18 }}>
        {spec.title.map((line, li) => (
          <div key={li} style={{ display: 'flex', fontSize: 78, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.02 }}>
            {line.map((seg, si) => (
              <span key={si} style={{ color: seg.accent ? accent : TEXT, whiteSpace: 'pre' }}>
                {seg.text}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', fontSize: 28, color: MUTED, marginTop: 16 }}>{spec.subtitle}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: rowGap, marginTop: 48 }}>
        {spec.rows.map((row, i) => {
          const first = i === 0;
          const avatar = avatars[i];
          return (
            <div
              key={row.rank}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                padding: `${rowPad}px 30px`,
                borderRadius: 22,
                backgroundColor: first ? rgba(accent, 0.07) : 'rgba(255,255,255,0.035)',
                border: first ? `1px solid ${rgba(accent, 0.35)}` : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div style={{ display: 'flex', width: 56, flexShrink: 0, justifyContent: 'center', fontSize: 44, fontWeight: 700, color: first ? accent : DIM }}>
                {row.rank}
              </div>
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain elements
                <img
                  src={avatar}
                  alt=""
                  width={100}
                  height={100}
                  style={{
                    width: 100,
                    height: 100,
                    flexShrink: 0,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: first ? `3px solid ${rgba(accent, 0.6)}` : '3px solid rgba(255,255,255,0.12)',
                    // Satori rejects `boxShadow: undefined` ("Invalid boxShadow value") — spread it in.
                    ...(first ? { boxShadow: `0 0 28px ${rgba(accent, 0.35)}` } : {}),
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 100,
                    height: 100,
                    flexShrink: 0,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1a1a24',
                    border: first ? `3px solid ${rgba(accent, 0.6)}` : '3px solid rgba(255,255,255,0.12)',
                    fontSize: 38,
                    fontWeight: 700,
                    color: TEXT,
                  }}
                >
                  {initials[i]}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', width: NAME_WIDTH, flexShrink: 0 }}>
                <div style={{ display: 'flex', fontSize: 42, lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: NAME_WIDTH }}>
                  {row.name}
                </div>
                {row.meta && (
                  <div style={{ display: 'flex', fontSize: 24, lineHeight: 1.25, color: MUTED, marginTop: 4, width: NAME_WIDTH }}>
                    {row.meta}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexGrow: 1 }}>
                <div style={{ display: 'flex', fontSize: 54, fontWeight: 700, letterSpacing: '-0.02em', color: valueColor, fontVariantNumeric: 'tabular-nums' }}>
                  {row.value}
                </div>
                <div style={{ display: 'flex', fontSize: 22, color: DIM, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
                  {row.unit}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: 24 }}>
        <div style={{ display: 'flex', fontSize: 22, letterSpacing: '0.22em', color: DIM }}>STREAMERTIMES.TV</div>
        <div style={{ display: 'flex', fontSize: 20, color: FAINT, whiteSpace: 'nowrap' }}>{spec.footnote}</div>
      </div>
    </div>
  );
}
