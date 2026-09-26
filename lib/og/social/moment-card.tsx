import type { ReactElement } from 'react';
import type { MomentCardSpec, MomentMotif } from './types';
import { ACCENT_HEX, CANVAS, corners, DIM, eyebrowParts, FAINT, glow, MUTED, rgba, TEXT } from './theme';

// Single-moment card (Post B): avatar large in the upper third with a
// type-coloured ring/glow, the headline template, the big number, one
// motif (ring fill / sparkline / arc) and the fun-fact block in the lower
// third. Only the avatar identifies the streamer — no category art (user
// decision 2026-09-26).

export interface MomentCardProps {
  spec: MomentCardSpec;
  avatar: string | null;
  initials: string;
}

const AVATAR = 400;

/** The avatar shrinks when the card also carries a sparkline and a fun fact. */
function avatarSize(spec: MomentCardSpec): number {
  if (!spec.fun_fact) return 440;
  return spec.motif.type === 'sparkline' ? 320 : 400;
}

/** The headline number is shown unless the template title already states it. */
function showHeadline(spec: MomentCardSpec): boolean {
  const titleText = spec.title.map((l) => l.map((s) => s.text).join('')).join(' ').toLowerCase();
  const firstToken = spec.headline.split(' ')[0]?.toLowerCase() ?? '';
  return firstToken.length === 0 || !titleText.includes(firstToken);
}

/**
 * Milestone ring: 60 ticks around the avatar, the first `fill` share lit in
 * the accent colour (how far past the threshold the streamer is), the rest
 * dim. Drawn as three circles: dim ticks, lit ticks, and a canvas-coloured
 * cover arc that hides the lit ticks beyond the fill share.
 */
function Ring({ fill, accent, avatar }: { fill: number; accent: string; avatar: number }): ReactElement {
  const size = avatar + 56;
  const cx = size / 2;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const ticks = 60;
  const dash = c / ticks;
  const tickPattern = `${(dash * 0.55).toFixed(2)} ${(dash * 0.45).toFixed(2)}`;
  const lit = Math.min(1, Math.max(0.02, fill));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', top: -28, left: -28 }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={rgba(accent, 0.22)} strokeWidth={8} strokeDasharray={tickPattern} transform={`rotate(-90 ${cx} ${cx})`} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={accent} strokeWidth={8} strokeDasharray={tickPattern} transform={`rotate(-90 ${cx} ${cx})`} />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="#0A0A0F"
        strokeWidth={12}
        strokeDasharray={`${(c * (1 - lit)).toFixed(2)} ${c.toFixed(2)}`}
        strokeDashoffset={(-c * lit).toFixed(2)}
        transform={`rotate(-90 ${cx} ${cx})`}
      />
    </svg>
  );
}

function Arc({ hours, accent, avatar }: { hours: number; accent: string; avatar: number }): ReactElement {
  const size = avatar + 56;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const fill = Math.min(1, hours / 72);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', top: -28, left: -28 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={rgba(accent, 0.15)} strokeWidth={8} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${c * fill} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function Sparkline({ motif, accent, height }: { motif: Extract<MomentMotif, { type: 'sparkline' }>; accent: string; height: number }): ReactElement {
  const w = 904;
  const h = height;
  const pts = motif.points.length ? motif.points : [0];
  const max = Math.max(...pts, motif.baseline, 1);
  const n = pts.length;
  const x = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * (w - 8) + 4);
  const y = (v: number) => h - 6 - (v / max) * (h - 12);
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${path} L${x(n - 1).toFixed(1)} ${h} L${x(0).toFixed(1)} ${h} Z`;
  const peakX = x(motif.peak_index);
  const peakY = y(pts[motif.peak_index] ?? 0);
  const baseY = y(motif.baseline);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={area} fill={rgba(accent, 0.12)} />
      <path d={path} fill="none" stroke={accent} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      <line x1={0} y1={baseY} x2={w} y2={baseY} stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeDasharray="10 10" />
      <circle cx={peakX} cy={peakY} r={9} fill={accent} stroke="#0A0A0F" strokeWidth={3} />
    </svg>
  );
}

export function MomentCard({ spec, avatar, initials }: MomentCardProps): ReactElement {
  const accent = ACCENT_HEX[spec.accent];
  const hasFact = !!spec.fun_fact;
  const size = avatarSize(spec);
  const headline = showHeadline(spec);
  const compact = spec.motif.type === 'sparkline' && hasFact;
  return (
    <div style={{ ...CANVAS, backgroundImage: glow(spec.accent, '30%'), alignItems: 'center' }}>
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

      <div style={{ display: 'flex', position: 'relative', width: size, height: size, marginTop: compact ? 36 : 44, alignItems: 'center', justifyContent: 'center' }}>
        {spec.motif.type === 'ring' && <Ring fill={spec.motif.fill} accent={accent} avatar={size} />}
        {spec.motif.type === 'arc' && <Arc hours={spec.motif.hours} accent={accent} avatar={size} />}
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain elements
          <img
            src={avatar}
            alt=""
            width={size}
            height={size}
            style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `6px solid ${rgba(accent, 0.7)}`, boxShadow: `0 0 80px ${rgba(accent, 0.35)}` }}
          />
        ) : (
          <div
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1a1a24',
              border: `6px solid ${rgba(accent, 0.7)}`,
              boxShadow: `0 0 80px ${rgba(accent, 0.35)}`,
              fontSize: Math.round(size * 0.35),
              fontWeight: 700,
              color: TEXT,
            }}
          >
            {initials}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', fontSize: compact ? 54 : 62, fontWeight: 700, letterSpacing: '-0.02em', marginTop: compact ? 24 : 36, whiteSpace: 'nowrap' }}>
        {spec.name.length > 24 ? `${spec.name.slice(0, 23)}…` : spec.name}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: compact ? 14 : 22 }}>
        {spec.title.map((line, li) => (
          <div key={li} style={{ display: 'flex', fontSize: compact ? 58 : 68, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.04 }}>
            {line.map((seg, si) => (
              <span key={si} style={{ color: seg.accent ? accent : TEXT, whiteSpace: 'pre' }}>
                {seg.text}
              </span>
            ))}
          </div>
        ))}
      </div>

      {headline && (
        <div style={{ display: 'flex', fontSize: compact ? 48 : 56, fontWeight: 700, color: accent, letterSpacing: '-0.02em', marginTop: compact ? 10 : 16, fontVariantNumeric: 'tabular-nums' }}>
          {spec.headline}
        </div>
      )}

      <div style={{ display: 'flex', fontSize: compact ? 28 : 34, color: MUTED, marginTop: compact ? 10 : 18, textAlign: 'center' }}>{spec.subline}</div>

      {spec.motif.type === 'sparkline' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: hasFact ? 30 : 60 }}>
          <Sparkline motif={spec.motif} accent={accent} height={hasFact ? 120 : 170} />
          <div style={{ display: 'flex', fontSize: 22, color: DIM, marginTop: 8 }}>{spec.motif.label}</div>
        </div>
      )}

      {spec.fun_fact && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 904,
            marginTop: spec.motif.type === 'sparkline' ? 26 : 52,
            padding: '30px 36px',
            borderRadius: 24,
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: `1px solid ${rgba(accent, 0.25)}`,
          }}
        >
          <div style={{ display: 'flex', fontSize: 20, letterSpacing: '0.14em', color: accent, fontWeight: 700 }}>{spec.fun_fact.eyebrow}</div>
          {/* Up to ~150 characters fit three lines at 34 px; longer story lines step down so four lines still fit the block. */}
          <div style={{ display: 'flex', fontSize: spec.fun_fact.text.length > 150 ? 29 : 34, lineHeight: 1.3, marginTop: 14, color: TEXT }}>{spec.fun_fact.text}</div>
          {spec.fun_fact.date_label && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 22, color: DIM, marginTop: 12 }}>{spec.fun_fact.date_label}</div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: 904, marginTop: 'auto', paddingTop: 24 }}>
        <div style={{ display: 'flex', fontSize: 22, letterSpacing: '0.22em', color: DIM }}>STREAMERTIMES.TV</div>
        <div style={{ display: 'flex', fontSize: 20, color: FAINT, whiteSpace: 'nowrap' }}>{spec.footnote}</div>
      </div>
    </div>
  );
}
