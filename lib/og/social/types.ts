// Social card spec — the contract between the StreamHub backend
// (supabase/functions/_shared/social-cards.ts, which resolves templates,
// numbers and avatars) and this renderer (Epic M27 §A1). The website never
// decides what a card says; it only paints the spec. A fixture with every
// layout lives in __fixtures__/social-card-spec.fixture.json (copied from the
// backend; lib/og/social/__tests__/spec.test.ts parses it, so a contract
// change on either side fails a test before it reaches production).

export const SOCIAL_CARD_SPEC_VERSION = 1;
export const SOCIAL_CARD_SIZE = { width: 1080, height: 1350 } as const;

export type CardAccent = 'cyan' | 'green' | 'gold' | 'magenta';

export interface TitleSegment {
  text: string;
  accent: boolean;
}

export interface ListCardRow {
  rank: number;
  name: string;
  avatar_url: string | null;
  value: string;
  unit: string;
  meta: string | null;
}

export type ListCardKind = 'peak' | 'growth' | 'followers' | 'milestones';

export interface ListCardSpec {
  version: number;
  layout: 'list';
  card: ListCardKind;
  accent: CardAccent;
  eyebrow: string;
  eyebrow_accent: string;
  title: TitleSegment[][];
  subtitle: string;
  rows: ListCardRow[];
  footnote: string;
}

export type MomentType = 'milestone' | 'record' | 'marathon';

export type MomentMotif =
  | { type: 'ring'; fill: number; label: string }
  | { type: 'sparkline'; points: number[]; peak_index: number; baseline: number; label: string }
  | { type: 'arc'; hours: number; label: string };

export interface MomentCardSpec {
  version: number;
  layout: 'moment';
  moment: MomentType;
  accent: CardAccent;
  eyebrow: string;
  eyebrow_accent: string;
  title: TitleSegment[][];
  name: string;
  avatar_url: string | null;
  headline: string;
  subline: string;
  motif: MomentMotif;
  /** The story block; no date line (the text is the whole week in review, 2026-09-27). */
  fun_fact: { eyebrow: string; text: string } | null;
  footnote: string;
}

export type SocialCardSpec = ListCardSpec | MomentCardSpec;

// ============================================
// Validation (no zod in this repo; small hand-rolled checks)
// ============================================

export class SocialCardSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SocialCardSpecError';
  }
}

const ACCENTS: CardAccent[] = ['cyan', 'green', 'gold', 'magenta'];
const LIST_KINDS: ListCardKind[] = ['peak', 'growth', 'followers', 'milestones'];
const MOMENT_TYPES: MomentType[] = ['milestone', 'record', 'marathon'];
const MAX_ROWS = 5;
const MAX_TEXT = 400;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, field: string, max = MAX_TEXT): string {
  if (typeof v !== 'string') throw new SocialCardSpecError(`${field} must be a string`);
  if (v.length > max) throw new SocialCardSpecError(`${field} longer than ${max} characters`);
  return v;
}

function strOrNull(v: unknown, field: string, max = MAX_TEXT): string | null {
  return v === null || v === undefined ? null : str(v, field, max);
}

function num(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new SocialCardSpecError(`${field} must be a finite number`);
  return v;
}

function httpsUrlOrNull(v: unknown, field: string): string | null {
  if (v === null || v === undefined) return null;
  const s = str(v, field, 2000);
  if (!/^https:\/\//.test(s)) throw new SocialCardSpecError(`${field} must be an https URL`);
  return s;
}

function title(v: unknown): TitleSegment[][] {
  if (!Array.isArray(v) || v.length < 1 || v.length > 3) throw new SocialCardSpecError('title must have 1–3 lines');
  return v.map((line, li) => {
    if (!Array.isArray(line) || line.length < 1) throw new SocialCardSpecError(`title line ${li} must be a non-empty array`);
    return line.map((seg, si) => {
      if (!isObj(seg)) throw new SocialCardSpecError(`title[${li}][${si}] must be an object`);
      return { text: str(seg.text, `title[${li}][${si}].text`, 80), accent: seg.accent === true };
    });
  });
}

function common(input: Record<string, unknown>) {
  if (input.version !== SOCIAL_CARD_SPEC_VERSION) {
    throw new SocialCardSpecError(`unsupported spec version ${String(input.version)} (renderer: ${SOCIAL_CARD_SPEC_VERSION})`);
  }
  const accent = input.accent;
  if (typeof accent !== 'string' || !ACCENTS.includes(accent as CardAccent)) throw new SocialCardSpecError('accent invalid');
  return {
    version: SOCIAL_CARD_SPEC_VERSION,
    accent: accent as CardAccent,
    eyebrow: str(input.eyebrow, 'eyebrow', 120),
    eyebrow_accent: str(input.eyebrow_accent, 'eyebrow_accent', 60),
    title: title(input.title),
    footnote: str(input.footnote, 'footnote', 120),
  };
}

export function parseSocialCardSpec(input: unknown): SocialCardSpec {
  if (!isObj(input)) throw new SocialCardSpecError('spec must be an object');
  const base = common(input);
  if (input.layout === 'list') {
    const card = input.card;
    if (typeof card !== 'string' || !LIST_KINDS.includes(card as ListCardKind)) throw new SocialCardSpecError('card invalid');
    if (!Array.isArray(input.rows) || input.rows.length < 1 || input.rows.length > MAX_ROWS) {
      throw new SocialCardSpecError(`rows must have 1–${MAX_ROWS} entries`);
    }
    const rows: ListCardRow[] = input.rows.map((r, i) => {
      if (!isObj(r)) throw new SocialCardSpecError(`rows[${i}] must be an object`);
      return {
        rank: num(r.rank, `rows[${i}].rank`),
        name: str(r.name, `rows[${i}].name`, 40),
        avatar_url: httpsUrlOrNull(r.avatar_url, `rows[${i}].avatar_url`),
        value: str(r.value, `rows[${i}].value`, 20),
        unit: str(r.unit, `rows[${i}].unit`, 20),
        meta: strOrNull(r.meta, `rows[${i}].meta`, 120),
      };
    });
    return { ...base, layout: 'list', card: card as ListCardKind, subtitle: str(input.subtitle, 'subtitle', 160), rows };
  }
  if (input.layout === 'moment') {
    const moment = input.moment;
    if (typeof moment !== 'string' || !MOMENT_TYPES.includes(moment as MomentType)) throw new SocialCardSpecError('moment invalid');
    const m = input.motif;
    if (!isObj(m)) throw new SocialCardSpecError('motif must be an object');
    let motif: MomentMotif;
    if (m.type === 'ring') {
      const fill = num(m.fill, 'motif.fill');
      motif = { type: 'ring', fill: Math.min(1, Math.max(0, fill)), label: str(m.label, 'motif.label', 40) };
    } else if (m.type === 'sparkline') {
      if (!Array.isArray(m.points) || m.points.length > 800) throw new SocialCardSpecError('motif.points must be an array (≤ 800)');
      const points = m.points.map((p, i) => num(p, `motif.points[${i}]`));
      motif = {
        type: 'sparkline',
        points,
        peak_index: Math.min(points.length - 1, Math.max(0, Math.round(num(m.peak_index, 'motif.peak_index')))),
        baseline: num(m.baseline, 'motif.baseline'),
        label: str(m.label, 'motif.label', 80),
      };
    } else if (m.type === 'arc') {
      motif = { type: 'arc', hours: num(m.hours, 'motif.hours'), label: str(m.label, 'motif.label', 20) };
    } else {
      throw new SocialCardSpecError('motif.type invalid');
    }
    let funFact: MomentCardSpec['fun_fact'] = null;
    if (input.fun_fact !== null && input.fun_fact !== undefined) {
      if (!isObj(input.fun_fact)) throw new SocialCardSpecError('fun_fact must be an object or null');
      funFact = {
        eyebrow: str(input.fun_fact.eyebrow, 'fun_fact.eyebrow', 80),
        text: str(input.fun_fact.text, 'fun_fact.text', 320), // writer cap 280 + headroom
      };
    }
    return {
      ...base,
      layout: 'moment',
      moment: moment as MomentType,
      name: str(input.name, 'name', 40),
      avatar_url: httpsUrlOrNull(input.avatar_url, 'avatar_url'),
      headline: str(input.headline, 'headline', 60),
      subline: str(input.subline, 'subline', 120),
      motif,
      fun_fact: funFact,
    };
  }
  throw new SocialCardSpecError('layout must be "list" or "moment"');
}
