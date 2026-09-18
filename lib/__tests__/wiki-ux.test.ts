// UX round (2026-09-18): clip gate, date labels, prose game links, teaser
// parts, distinct chart tick labels.
import { describe, it, expect } from 'vitest';
import {
  NOTABLE_CLIP_MIN_VIEWS,
  NOTABLE_CLIPS_MIN_COUNT,
  articleSegments,
  formatFactAsOf,
  formatSourceDate,
  gameLinkTargets,
  linkGameMentions,
  wikiNotableClips,
  wikiTeaserParts,
} from '../wiki';
import { formatCompactDistinct } from '../format/number';
import { UI_LANGS } from '../i18n-core';
import { UI_STRINGS } from '../i18n-ui';

const clip = (view_count: number | null, id = String(view_count)) => ({ id, view_count });

describe('wikiNotableClips', () => {
  it('keeps the API order and only clips above the floor', () => {
    const out = wikiNotableClips([clip(2479), clip(1552), clip(525), clip(99), clip(302)]);
    expect(out.map((c) => c.view_count)).toEqual([2479, 1552, 525, 302]);
  });

  it('hides the section for channels whose clips nobody watched (audit: zlaner, jackfromsoft)', () => {
    expect(wikiNotableClips([70, 18, 11, 10, 9, 9].map((v) => clip(v)))).toEqual([]);
    // One clip above the floor is still not a section.
    expect(wikiNotableClips([129, 76, 17, 10, 6, 5].map((v) => clip(v)))).toEqual([]);
  });

  it('needs the minimum count of qualifying clips', () => {
    const floor = NOTABLE_CLIP_MIN_VIEWS;
    const enough = Array.from({ length: NOTABLE_CLIPS_MIN_COUNT }, (_, i) => clip(floor + i));
    expect(wikiNotableClips(enough)).toHaveLength(NOTABLE_CLIPS_MIN_COUNT);
    expect(wikiNotableClips(enough.slice(1))).toEqual([]);
  });

  it('treats a null view count as not notable and tolerates an empty list', () => {
    expect(wikiNotableClips([clip(null), clip(500), clip(400), clip(300)])).toHaveLength(3);
    expect(wikiNotableClips([])).toEqual([]);
  });
});

describe('formatFactAsOf / formatSourceDate', () => {
  it('caps the infobox "as of" at month precision', () => {
    expect(formatFactAsOf('2020-05-21', 'en')).toBe('May 2020');
    expect(formatFactAsOf('2021-09', 'en')).toBe('September 2021');
    expect(formatFactAsOf('2026', 'en')).toBe('2026');
    expect(formatFactAsOf('2020-05-21', 'de')).toBe('Mai 2020');
  });

  it('never shows a raw ISO date for any UI locale', () => {
    for (const lang of UI_LANGS) {
      expect(formatFactAsOf('2020-05-21', lang), lang).not.toMatch(/\d{4}-\d{2}/);
      expect(formatSourceDate('2021-09-01', lang), lang).not.toMatch(/\d{4}-\d{2}/);
    }
  });

  it('formats sources at their own precision and passes free text through', () => {
    expect(formatSourceDate('2021-09-01', 'en')).toBe('September 1, 2021');
    expect(formatSourceDate('2024-09', 'en')).toBe('September 2024');
    expect(formatSourceDate('2018', 'en')).toBe('2018');
    expect(formatSourceDate('n.d.', 'en')).toBe('n.d.');
    expect(formatFactAsOf('early 2021', 'en')).toBe('early 2021');
    // An impossible calendar date must not render "Invalid Date".
    expect(formatSourceDate('2021-13-45', 'en')).not.toMatch(/invalid/i);
  });
});

describe('gameLinkTargets', () => {
  const games = [
    { category: 'Counter-Strike' },
    { category: 'Counter-Strike 2' },
    { category: 'Marvel Rivals' },
    { category: 'Music' },
    { category: 'Gaming' },
    { category: 'Just Chatting' },
    { category: 'Rust' },
    { category: 'GTA' },
    { category: '' },
    { category: 'Marvel Rivals' },
  ];

  it('drops generic names, short names, blanks and duplicates; longest first', () => {
    const out = gameLinkTargets(games);
    expect(out.map((t) => t.name)).toEqual([
      'Counter-Strike 2',
      'Counter-Strike',
      'Marvel Rivals',
      'Rust',
    ]);
    expect(out[0].slug).toBe('counter-strike-2');
  });
});

describe('linkGameMentions', () => {
  const targets = gameLinkTargets([
    { category: 'Counter-Strike' },
    { category: 'Counter-Strike 2' },
    { category: 'Marvel Rivals' },
    { category: 'Rust' },
    { category: 'Overwatch' },
  ]);

  it('links the first mention only, page-wide', () => {
    const linked = new Set<string>();
    const a = linkGameMentions('He plays Marvel Rivals. Marvel Rivals again.', targets, linked);
    expect(a).toEqual([
      { type: 'text', text: 'He plays ' },
      { type: 'game', text: 'Marvel Rivals', slug: 'marvel-rivals' },
      { type: 'text', text: '. Marvel Rivals again.' },
    ]);
    const b = linkGameMentions('Later, Marvel Rivals once more.', targets, linked);
    expect(b).toEqual([{ type: 'text', text: 'Later, Marvel Rivals once more.' }]);
  });

  it('prefers the longer name and never links inside it', () => {
    const out = linkGameMentions('He moved to Counter-Strike 2 in 2023.', targets, new Set());
    expect(out.filter((s) => s.type === 'game')).toEqual([
      { type: 'game', text: 'Counter-Strike 2', slug: 'counter-strike-2' },
    ]);
  });

  it('matches whole words, case-sensitively', () => {
    const linked = new Set<string>();
    expect(linkGameMentions('Trust issues and Rusty gear.', targets, linked)).toEqual([
      { type: 'text', text: 'Trust issues and Rusty gear.' },
    ]);
    expect(linkGameMentions('They overwatch the lobby.', targets, linked)).toEqual([
      { type: 'text', text: 'They overwatch the lobby.' },
    ]);
    // Punctuation and quotes are boundaries; so is a possessive.
    const out = linkGameMentions('"Rust", Overwatch’s rival', targets, linked);
    expect(out.filter((s) => s.type === 'game').map((s) => s.text)).toEqual(['Rust', 'Overwatch']);
  });

  it('skips a bounded later mention when the first one is glued to a word', () => {
    const out = linkGameMentions('Rusty start, then Rust.', targets, new Set());
    expect(out).toEqual([
      { type: 'text', text: 'Rusty start, then ' },
      { type: 'game', text: 'Rust', slug: 'rust' },
      { type: 'text', text: '.' },
    ]);
  });

  it('keeps several games of one paragraph in text order and loses no characters', () => {
    const text = 'From Overwatch to Rust and Marvel Rivals, in that order.';
    const out = linkGameMentions(text, targets, new Set());
    expect(out.filter((s) => s.type === 'game').map((s) => s.text)).toEqual([
      'Overwatch',
      'Rust',
      'Marvel Rivals',
    ]);
    expect(out.map((s) => s.text).join('')).toBe(text);
  });

  it('is a no-op without targets or text', () => {
    expect(linkGameMentions('Rust', [], new Set())).toEqual([{ type: 'text', text: 'Rust' }]);
    expect(linkGameMentions('', targets, new Set())).toEqual([{ type: 'text', text: '' }]);
  });
});

describe('articleSegments', () => {
  const targets = gameLinkTargets([{ category: 'Marvel Rivals' }]);

  it('splits footnotes first, then links inside the text runs', () => {
    const out = articleSegments('He plays Marvel Rivals daily. [2] More text. [9]', 3, targets, new Set());
    expect(out).toEqual([
      { type: 'text', text: 'He plays ' },
      { type: 'game', text: 'Marvel Rivals', slug: 'marvel-rivals' },
      { type: 'text', text: ' daily.' },
      { type: 'ref', n: 2 },
      // [9] is out of range (3 sources): stays plain text.
      { type: 'text', text: ' More text. [9]' },
    ]);
  });
});

describe('wikiTeaserParts', () => {
  const W = UI_STRINGS.en.wiki;

  it('names only the facts the profile holds (audit: the static teaser promised age + net worth)', () => {
    const tim = [{ key: 'real_name' }, { key: 'est_income_monthly_usd' }, { key: 'residence' }];
    expect(wikiTeaserParts(tim, W.titlePart, W.titleSep, W.titleAnd, 'en')).toBe(
      'Earnings, Real Name & Career',
    );
    expect(wikiTeaserParts([], W.titlePart, W.titleSep, W.titleAnd, 'en')).toBe('Career & Facts');
  });

  it('sentence-cases locales whose title parts are lowercase', () => {
    const es = UI_STRINGS.es.wiki;
    expect(
      wikiTeaserParts([{ key: 'birth_date' }], es.titlePart, es.titleSep, es.titleAnd, 'es'),
    ).toBe('Edad y carrera');
  });

  it.each([...UI_LANGS])('%s teaser carries the name and the parts', (lang) => {
    const L = UI_STRINGS[lang].wiki;
    const parts = wikiTeaserParts([{ key: 'birth_date' }], L.titlePart, L.titleSep, L.titleAnd, lang);
    const sub = L.teaserSub('TestStreamer', parts);
    expect(sub).toContain('TestStreamer');
    expect(sub).toContain(parts);
  });
});

describe('formatCompactDistinct', () => {
  it('grows the precision until the ends of the scale differ (audit: three "7.6M" labels)', () => {
    // A "latest" just under the max may share its label; min and max may not.
    expect(formatCompactDistinct([7612268, 7611900, 7608100])).toEqual([
      '7.612M',
      '7.612M',
      '7.608M',
    ]);
  });

  it('keeps the one-decimal form when it already separates the values', () => {
    expect(formatCompactDistinct([12500, 9800])).toEqual(['12.5K', '9.8K']);
    expect(formatCompactDistinct([950, 950])).toEqual(['950', '950']);
  });

  it('gives equal inputs equal labels', () => {
    const [max, last, min] = formatCompactDistinct([7612268, 7612268, 7608100]);
    expect(max).toBe(last);
    expect(min).not.toBe(max);
  });

  it('falls back to full numbers when three digits are not enough', () => {
    expect(formatCompactDistinct([7612268, 7612100])).toEqual(['7,612,268', '7,612,100']);
  });

  it('localizes and survives non-finite input', () => {
    // Intl puts a no-break space before the German unit.
    expect(
      formatCompactDistinct([7612268, 7608100], 'de').map((v) => v.replace(/\s/g, ' ')),
    ).toEqual(['7,612 Mio.', '7,608 Mio.']);
    expect(formatCompactDistinct([Number.NaN, 5])).toEqual(['', '5']);
    expect(formatCompactDistinct([])).toEqual([]);
  });
});
