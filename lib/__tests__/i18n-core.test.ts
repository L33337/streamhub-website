import { describe, it, expect } from 'vitest';
import {
  listConjunction,
  pluralForms,
  resolveUiLang,
  weekdayLong,
  weekdayShort,
} from '../i18n-core';

describe('resolveUiLang', () => {
  it('resolves supported codes, prefixes and casing', () => {
    expect(resolveUiLang('de')).toBe('de');
    expect(resolveUiLang('de-AT')).toBe('de');
    expect(resolveUiLang('PL')).toBe('pl');
    expect(resolveUiLang('pt-BR')).toBe('pt');
  });

  it('falls back to en for null/empty/unknown values', () => {
    expect(resolveUiLang(null)).toBe('en');
    expect(resolveUiLang(undefined)).toBe('en');
    expect(resolveUiLang('')).toBe('en');
    expect(resolveUiLang('other')).toBe('en');
    expect(resolveUiLang('ko')).toBe('en');
  });
});

describe('pluralForms', () => {
  const RU = { one: 'one', few: 'few', many: 'many', other: 'other' };

  it('selects Slavic categories correctly (ru/uk/pl)', () => {
    for (const lang of ['ru', 'uk', 'pl']) {
      expect(pluralForms(lang, 1, RU), `${lang}:1`).toBe('one');
      expect(pluralForms(lang, 2, RU), `${lang}:2`).toBe('few');
      expect(pluralForms(lang, 5, RU), `${lang}:5`).toBe('many');
      expect(pluralForms(lang, 11, RU), `${lang}:11`).toBe('many');
      expect(pluralForms(lang, 22, RU), `${lang}:22`).toBe('few');
    }
    // 21 is 'one' in ru/uk but 'many' in pl (Polish one = exactly 1).
    expect(pluralForms('ru', 21, RU)).toBe('one');
    expect(pluralForms('uk', 21, RU)).toBe('one');
    expect(pluralForms('pl', 21, RU)).toBe('many');
  });

  it('single-category languages always hit other', () => {
    expect(pluralForms('ja', 1, { other: 'x' })).toBe('x');
    expect(pluralForms('ja', 5, { one: 'y', other: 'x' })).toBe('x');
  });

  it('falls back to other for missing categories and bad tags', () => {
    expect(pluralForms('ru', 2, { one: 'a', other: 'z' })).toBe('z');
    expect(pluralForms('not a tag!', 1, { one: 'a', other: 'z' })).toBe('z');
  });
});

describe('weekday labels', () => {
  it('walks Mon→Sun in the requested language', () => {
    expect(weekdayLong(0, 'en')).toBe('Monday');
    expect(weekdayLong(6, 'en')).toBe('Sunday');
    expect(weekdayLong(0, 'de')).toBe('Montag');
    expect(weekdayShort(5, 'en')).toBe('Sat');
  });

  it('falls back to en-US on invalid tags', () => {
    expect(weekdayLong(0, 'not a tag!')).toBe('Monday');
  });
});

describe('listConjunction', () => {
  it('keeps the legacy English format byte-identical (no Oxford comma)', () => {
    expect(listConjunction([], 'en')).toBe('');
    expect(listConjunction(['A'], 'en')).toBe('A');
    expect(listConjunction(['A', 'B'], 'en')).toBe('A and B');
    expect(listConjunction(['A', 'B', 'C'], 'en')).toBe('A, B and C');
  });

  it('localizes the conjunction', () => {
    expect(listConjunction(['A', 'B'], 'de')).toBe('A und B');
    expect(listConjunction(['A', 'B', 'C'], 'de')).toBe('A, B und C');
    expect(listConjunction(['A', 'B'], 'ru')).toContain(' и ');
  });
});
