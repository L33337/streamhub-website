import type { ReactElement } from 'react';
import type { MomentCardSpec, MomentMotif } from './types';
import { ACCENT_HEX, CANVAS, corners, DIM, eyebrowParts, FAINT, glow, MUTED, rgba, TEXT } from './theme';

// Single-moment card (Post B): avatar large in the upper third with a
// type-coloured ring/glow, the headline template, the big number, one
// motif (ring fill / sparkline / arc) and the story block in the lower
// third. Only the avatar identifies the streamer — no category art (user
// decision 2026-09-26).
//
// Vertical budget (2026-09-27): every block has an explicit line height and
// `flexShrink: 0`, and the avatar takes whatever height is left. Before, the
// blocks shrank when the content was taller than the canvas, and Satori
// painted the name over the title and the number over the subline on
// record cards (sparkline + fun fact + two-line title + number).

export interface MomentCardProps {
  spec: MomentCardSpec;
  avatar: string | null;
  initials: string;
}

/** Canvas height minus the padding of CANVAS (96 top, 88 bottom). */
const INNER_HEIGHT = 1350 - 96 - 88;
const SAFETY = 24;

/** The headline number is shown unless the template title already states it. */
function showHeadline(spec: MomentCardSpec): boolean {
  const titleText = spec.title.map((l) => l.map((s) => s.text).join('')).join(' ').toLowerCase();
  const firstToken = spec.headline.split(' ')[0]?.toLowerCase() ?? '';
  return firstToken.length === 0 || !titleText.includes(firstToken);
}

interface Layout {
  dense: boolean;
  headline: boolean;
  avatar: number;
  avatarTop: number;
  nameSize: number;
  titleSize: number;
  headlineSize: number;
  sublineSize: number;
  sparkHeight: number;
  factTop: number;
  factFont: number;
  footerTop: number;
}

/** Story font size by length: ~46 characters per line at 34 px, ~54 at 29 px, ~60 at 26 px. */
export function storyFont(length: number): { size: number; lines: number } {
  if (length > 200) return { size: 26, lines: 5 };
  if (length > 130) return { size: 29, lines: 4 };
  return { size: 34, lines: 3 };
}

export function layoutFor(spec: MomentCardSpec): Layout {
  const dense = !!spec.fun_fact;
  const headline = showHeadline(spec);
  const nameSize = dense ? 54 : 62;
  const titleSize = dense ? 58 : 68;
  const headlineSize = dense ? 48 : 56;
  const sublineSize = dense ? 28 : 34;
  const sparkHeight = dense ? 96 : 170;
  const fact = spec.fun_fact ? storyFont(spec.fun_fact.text.length) : null;

  let fixed = 26 * 1.2; // eyebrow
  fixed += 36; // avatar top margin (base)
  fixed += 20 + nameSize * 1.15;
  fixed += 12 + spec.title.length * titleSize * 1.04;
  if (headline) fixed += 8 + headlineSize * 1.1;
  fixed += 8 + sublineSize * 1.2;
  if (spec.motif.type === 'sparkline') fixed += 24 + sparkHeight + 6 + 22 * 1.2;
  if (fact) fixed += 24 + 26 * 2 + 20 * 1.2 + 12 + fact.lines * fact.size * 1.3;
  fixed += 24 + 22 * 1.2; // footer
  fixed += SAFETY;

  const room = INNER_HEIGHT - fixed;
  const avatar = Math.max(240, Math.min(dense ? 400 : 440, Math.floor(room)));
  const extra = Math.max(0, room - avatar);
  // Leftover space is split above the avatar, above the story block and above the footer
  // (without a story block: half above the avatar, half above the footer).
  const share = Math.floor(extra / (fact ? 3 : 2));
  return {
    dense,
    headline,
    avatar,
    avatarTop: 36 + share,
    nameSize,
    titleSize,
    headlineSize,
    sublineSize,
    sparkHeight,
    factTop: 24 + (fact ? share : 0),
    factFont: fact?.size ?? 34,
    footerTop: 24,
  };
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

const FIXED = { display: 'flex', flexShrink: 0 } as const;

export function MomentCard({ spec, avatar, initials }: MomentCardProps): ReactElement {
  const accent = ACCENT_HEX[spec.accent];
  const l = layoutFor(spec);
  const size = l.avatar;
  return (
    <div style={{ ...CANVAS, backgroundImage: glow(spec.accent, '30%'), alignItems: 'center' }}>
      {corners().map((style, i) => (
        <div key={i} style={style} />
      ))}

      <div style={{ ...FIXED, fontSize: 26, lineHeight: 1.2, letterSpacing: '0.14em', color: DIM, textTransform: 'uppercase' }}>
        {eyebrowParts(spec.eyebrow, spec.eyebrow_accent).map((p, i) => (
          <span key={i} style={{ color: p.accent ? accent : DIM, fontWeight: p.accent ? 700 : 400, whiteSpace: 'pre' }}>
            {p.text}
          </span>
        ))}
      </div>

      <div style={{ ...FIXED, position: 'relative', width: size, height: size, marginTop: l.avatarTop, alignItems: 'center', justifyContent: 'center' }}>
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

      <div style={{ ...FIXED, fontSize: l.nameSize, lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 20, whiteSpace: 'nowrap' }}>
        {spec.name.length > 24 ? `${spec.name.slice(0, 23)}…` : spec.name}
      </div>

      <div style={{ ...FIXED, flexDirection: 'column', alignItems: 'center', marginTop: 12 }}>
        {spec.title.map((line, li) => (
          <div key={li} style={{ ...FIXED, fontSize: l.titleSize, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.04 }}>
            {line.map((seg, si) => (
              <span key={si} style={{ color: seg.accent ? accent : TEXT, whiteSpace: 'pre' }}>
                {seg.text}
              </span>
            ))}
          </div>
        ))}
      </div>

      {l.headline && (
        <div style={{ ...FIXED, fontSize: l.headlineSize, lineHeight: 1.1, fontWeight: 700, color: accent, letterSpacing: '-0.02em', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
          {spec.headline}
        </div>
      )}

      <div style={{ ...FIXED, fontSize: l.sublineSize, lineHeight: 1.2, color: MUTED, marginTop: 8, textAlign: 'center' }}>{spec.subline}</div>

      {spec.motif.type === 'sparkline' && (
        <div style={{ ...FIXED, flexDirection: 'column', alignItems: 'center', marginTop: 24 }}>
          <Sparkline motif={spec.motif} accent={accent} height={l.sparkHeight} />
          <div style={{ ...FIXED, fontSize: 22, lineHeight: 1.2, color: DIM, marginTop: 6 }}>{spec.motif.label}</div>
        </div>
      )}

      {spec.fun_fact && (
        <div
          style={{
            ...FIXED,
            flexDirection: 'column',
            width: 904,
            marginTop: l.factTop,
            padding: '26px 36px',
            borderRadius: 24,
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: `1px solid ${rgba(accent, 0.25)}`,
          }}
        >
          <div style={{ ...FIXED, fontSize: 20, lineHeight: 1.2, letterSpacing: '0.14em', color: accent, fontWeight: 700 }}>{spec.fun_fact.eyebrow}</div>
          <div style={{ ...FIXED, fontSize: l.factFont, lineHeight: 1.3, marginTop: 12, color: TEXT }}>{spec.fun_fact.text}</div>
        </div>
      )}

      <div style={{ ...FIXED, justifyContent: 'space-between', alignItems: 'flex-end', width: 904, marginTop: 'auto', paddingTop: l.footerTop }}>
        <div style={{ ...FIXED, fontSize: 22, lineHeight: 1.2, letterSpacing: '0.22em', color: DIM }}>STREAMERTIMES.TV</div>
        <div style={{ ...FIXED, fontSize: 20, lineHeight: 1.2, color: FAINT, whiteSpace: 'nowrap' }}>{spec.footnote}</div>
      </div>
    </div>
  );
}
