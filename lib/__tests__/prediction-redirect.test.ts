// Prediction slot-id parsing + the age-based "provably dead" shortcut.
//
// The age bound is a cross-repo contract: the backend caps id reuse at 10 days
// (MAX_ID_REUSE_AGE_MS in StreamHub's _shared/slot-reconcile.ts) and a reused
// id can be attached to a slot at most ~7 days out, so a LIVE slot's id never
// exceeds ~17 days. These tests pin the margin so a change on either side is
// visible here.

import { describe, expect, it } from 'vitest';
import {
  expiredPredictionStreamerSlug,
  parsePredictionSlotId,
  staleSlotRedirectSlug,
  STALE_SLOT_ID_MAX_AGE_MS,
} from '@/lib/prediction-redirect';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-08-17T12:00:00Z');

function id(slug: string, ageDays: number, index = 0): string {
  return `ai_slot_pred_${slug}_${NOW - ageDays * DAY}_${index}`;
}

describe('parsePredictionSlotId', () => {
  it('extracts slug and minted timestamp', () => {
    expect(parsePredictionSlotId('ai_slot_pred_northernlion_1786051545162_2')).toEqual({
      slug: 'northernlion',
      mintedAtMs: 1786051545162,
    });
  });

  it('handles slugs containing underscores and digits (greedy match backtracks)', () => {
    expect(parsePredictionSlotId('ai_slot_pred_rostislav999_1785987016037_2')?.slug).toBe(
      'rostislav999',
    );
    expect(parsePredictionSlotId('ai_slot_pred_some_long_slug_1786064128948_12')).toEqual({
      slug: 'some_long_slug',
      mintedAtMs: 1786064128948,
    });
  });

  it('rejects ids that are not prediction slots', () => {
    // Real slot ids carry a long number too — the prefix is what disambiguates.
    expect(parsePredictionSlotId('twitch-live-examplestreamer-317259025767')).toBeNull();
    expect(parsePredictionSlotId('ai_slot_pred_s1_100_0')).toBeNull(); // epoch too short
    expect(parsePredictionSlotId('')).toBeNull();
    expect(parsePredictionSlotId('ai_slot_pred__1786051545162_2')).toBeNull(); // empty slug
  });

  it('rejects slugs that are not path-safe', () => {
    expect(parsePredictionSlotId('ai_slot_pred_../../etc_1786051545162_0')).toBeNull();
    expect(parsePredictionSlotId('ai_slot_pred_a/b_1786051545162_0')).toBeNull();
  });

  it('keeps expiredPredictionStreamerSlug behaviour unchanged', () => {
    expect(expiredPredictionStreamerSlug('ai_slot_pred_choc_1785822021898_3')).toBe('choc');
    expect(expiredPredictionStreamerSlug('twitch-live-x-317259025767')).toBeNull();
  });
});

describe('staleSlotRedirectSlug', () => {
  it('short-circuits ids older than the cutoff', () => {
    expect(staleSlotRedirectSlug(id('tumblurr', 30), NOW)).toBe('tumblurr');
    expect(staleSlotRedirectSlug(id('choc', 105), NOW)).toBe('choc');
  });

  it('leaves young ids to the normal Partner-API lookup', () => {
    // A slot this fresh may well be alive; deciding here would break it.
    expect(staleSlotRedirectSlug(id('subroza', 0), NOW)).toBeNull();
    expect(staleSlotRedirectSlug(id('subroza', 7), NOW)).toBeNull();
  });

  it('keeps the margin over the backend reuse cap (10d) + prediction horizon (~7d)', () => {
    // 17d is the worst case for a still-valid id — it must NOT be redirected.
    expect(staleSlotRedirectSlug(id('scarra', 17), NOW)).toBeNull();
    expect(STALE_SLOT_ID_MAX_AGE_MS).toBeGreaterThan(17 * DAY);
  });

  it('boundary is exclusive — exactly at the cutoff is not yet stale', () => {
    expect(staleSlotRedirectSlug(id('k1ng', 21), NOW)).toBeNull();
    expect(staleSlotRedirectSlug(`ai_slot_pred_k1ng_${NOW - STALE_SLOT_ID_MAX_AGE_MS - 1}_0`, NOW)).toBe(
      'k1ng',
    );
  });

  it('never short-circuits a non-prediction id, however it looks', () => {
    expect(staleSlotRedirectSlug('twitch-live-examplestreamer-317259025767', NOW)).toBeNull();
    expect(staleSlotRedirectSlug('ai_slot_pred_s1_100_0', NOW)).toBeNull();
  });

  it('tolerates clock skew (id minted in the future) without redirecting', () => {
    expect(staleSlotRedirectSlug(id('agent00', -5), NOW)).toBeNull();
  });
});
