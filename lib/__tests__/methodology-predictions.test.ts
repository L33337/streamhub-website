import { describe, expect, it } from 'vitest';
import {
  CALIBRATION_ROW,
  CONFIDENCE_TIERS_COPY,
  OTHER_BADGES,
  PREDICTIONS_FAQ,
  PREDICTIONS_METHODOLOGY_DESCRIPTION,
  PREDICTIONS_METHODOLOGY_H1,
  PREDICTIONS_METHODOLOGY_INTRO,
  PREDICTIONS_METHODOLOGY_PATH,
  PREDICTIONS_METHODOLOGY_PUBLISHED_ISO,
  PREDICTIONS_METHODOLOGY_SECTIONS,
  PREDICTIONS_METHODOLOGY_SUBTITLE,
  PREDICTIONS_METHODOLOGY_TITLE,
  PREDICTIONS_METHODOLOGY_UPDATED_ISO,
  PREDICTIONS_METHODOLOGY_UPDATED_LABEL,
  PREDICTION_SOURCES,
} from '../methodology-predictions';
import { MAX_META_DESCRIPTION } from '../seo';

/** Every visible string of the page, flattened. */
function allCopy(): string[] {
  return [
    PREDICTIONS_METHODOLOGY_TITLE,
    PREDICTIONS_METHODOLOGY_DESCRIPTION,
    PREDICTIONS_METHODOLOGY_H1,
    PREDICTIONS_METHODOLOGY_SUBTITLE,
    ...PREDICTIONS_METHODOLOGY_INTRO,
    ...PREDICTION_SOURCES.flatMap((s) => [s.title, ...s.paragraphs]),
    ...PREDICTIONS_METHODOLOGY_SECTIONS.flatMap((s) => [
      s.heading,
      ...s.paragraphs,
      ...(s.bullets ?? []),
      ...(s.afterBullets ?? []),
    ]),
    ...CONFIDENCE_TIERS_COPY.flatMap((t) => [t.tagline, ...t.signals, t.inPractice]),
    ...OTHER_BADGES.flatMap((b) => [b.title, b.body]),
    ...PREDICTIONS_FAQ.flatMap((f) => [f.question, f.answer]),
  ];
}

describe('methodology/predictions copy', () => {
  it('keeps the SERP metadata inside the budgets', () => {
    // 60 = MAX_TITLE in lib/seo.ts (Google truncates around there); the
    // brand suffix is part of the string on this page class.
    expect(PREDICTIONS_METHODOLOGY_TITLE.length).toBeLessThanOrEqual(60);
    expect(PREDICTIONS_METHODOLOGY_TITLE.endsWith(' - Streamer Times')).toBe(true);
    expect(PREDICTIONS_METHODOLOGY_DESCRIPTION.length).toBeLessThanOrEqual(MAX_META_DESCRIPTION);
    expect(PREDICTIONS_METHODOLOGY_DESCRIPTION.length).toBeGreaterThanOrEqual(25);
  });

  it('spells the brand with a space everywhere a human reads it', () => {
    for (const text of allCopy()) {
      expect(text, text).not.toMatch(/StreamerTimes/);
      expect(text, text).not.toMatch(/StreamHub|StreamTV/);
    }
  });

  it('renders every string as clean non-empty text', () => {
    for (const text of allCopy()) {
      expect(text.trim()).not.toBe('');
      expect(text).not.toMatch(/undefined|\bNaN\b|\$\{|\[object/);
    }
  });

  it('describes all three confidence tiers, in badge order, with evidence and a hit rate', () => {
    expect(CONFIDENCE_TIERS_COPY.map((t) => t.level)).toEqual(['high', 'medium', 'low']);
    for (const tier of CONFIDENCE_TIERS_COPY) {
      expect(tier.signals.length, tier.level).toBeGreaterThanOrEqual(3);
      // The "in practice" line must state the ±2h window semantics somewhere —
      // that is the contract with the scoring in the backend.
      expect(tier.inPractice.length).toBeGreaterThan(40);
    }
    expect(CONFIDENCE_TIERS_COPY.map((t) => t.inPractice).join(' ')).toMatch(/two hours/);
  });

  it('covers the four non-confidence badges the site renders', () => {
    expect(OTHER_BADGES.map((b) => b.id)).toEqual(['new', 'uncertain', 'cancelled', 'live']);
  });

  it('ships a visible FAQ whose questions are questions', () => {
    expect(PREDICTIONS_FAQ.length).toBeGreaterThanOrEqual(6);
    for (const item of PREDICTIONS_FAQ) {
      expect(item.question.endsWith('?'), item.question).toBe(true);
      expect(item.answer.length, item.question).toBeGreaterThan(60);
    }
    // Unique questions — duplicate <h3>s read as scaled content.
    expect(new Set(PREDICTIONS_FAQ.map((f) => f.question)).size).toBe(PREDICTIONS_FAQ.length);
  });

  it('keeps section ids unique and anchor-safe', () => {
    const ids = [
      ...PREDICTION_SOURCES.map((s) => s.id),
      ...PREDICTIONS_METHODOLOGY_SECTIONS.map((s) => s.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it('mirrors the backend scoring window and evaluation rules in prose', () => {
    const grade = PREDICTIONS_METHODOLOGY_SECTIONS.find((s) => s.id === 'how-we-grade-ourselves');
    const text = [...(grade?.paragraphs ?? []), ...(grade?.bullets ?? [])].join(' ');
    // ±2h hit window (ACCURACY_THRESHOLD_MS) and the 6h no-show expiry
    // (evaluateExpiredPredictions) in generate-predictions / conflicts.ts.
    expect(text).toMatch(/within two hours/);
    expect(text).toMatch(/six hours/);
    // Inverted semantics for cancelled slots (M15).
    expect(text).toMatch(/other way round/);
  });

  it('dates are ISO and the label is the en-US long form used on legal pages', () => {
    expect(PREDICTIONS_METHODOLOGY_UPDATED_ISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(PREDICTIONS_METHODOLOGY_PUBLISHED_ISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(PREDICTIONS_METHODOLOGY_UPDATED_ISO >= PREDICTIONS_METHODOLOGY_PUBLISHED_ISO).toBe(true);
    expect(PREDICTIONS_METHODOLOGY_UPDATED_LABEL).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
  });

  it('formats calibration rows with grouped thousands', () => {
    expect(CALIBRATION_ROW(1234, 1600)).toBe('1,234 of 1,600 predictions hit the window');
    expect(CALIBRATION_ROW(7, 20)).toBe('7 of 20 predictions hit the window');
  });

  it('lives at the methodology sibling path', () => {
    expect(PREDICTIONS_METHODOLOGY_PATH).toBe('/methodology/predictions');
  });
});
