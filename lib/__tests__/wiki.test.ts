import { describe, it, expect } from 'vitest';
import type { PublicGame, PublicStreamerStatsCategory, WikiFact } from '../server/partner-api';
import {
  avatarLargeUrl,
  bannerDisplayUrl,
  displayAge,
  formatBirthDate,
  formatRegion,
  formatSharePercent,
  formatUsdRange,
  orderedWikiFacts,
  pickWikiArticle,
  splitFootnotes,
  wikiMetaDescription,
  wikiTopGames,
} from '../wiki';

const NOW = new Date('2026-08-17T12:00:00Z');

function fact(key: string, value = 'x'): WikiFact {
  return {
    key,
    value,
    value_num_low: null,
    value_num_high: null,
    is_estimate: false,
    as_of: null,
    source_ids: [1],
  };
}

describe('orderedWikiFacts', () => {
  it('orders by the fixed catalog and drops unknown keys', () => {
    const out = orderedWikiFacts([
      fact('net_worth_usd'),
      fact('real_name'),
      fact('future_key_from_newer_api'),
      fact('birth_date'),
    ]);
    expect(out.map((f) => f.key)).toEqual(['real_name', 'birth_date', 'net_worth_usd']);
  });
});

describe('splitFootnotes', () => {
  it('splits text and refs, trimming the space before a marker', () => {
    expect(splitFootnotes('Started in 2015. [1] Grew fast. [2]', 2)).toEqual([
      { type: 'text', text: 'Started in 2015.' },
      { type: 'ref', n: 1 },
      { type: 'text', text: ' Grew fast.' },
      { type: 'ref', n: 2 },
    ]);
  });

  it('leaves out-of-range refs as plain text', () => {
    expect(splitFootnotes('Claim. [7]', 2)).toEqual([{ type: 'text', text: 'Claim. [7]' }]);
  });

  it('returns the paragraph unchanged when there are no markers', () => {
    expect(splitFootnotes('Plain text.', 3)).toEqual([{ type: 'text', text: 'Plain text.' }]);
  });
});

describe('displayAge', () => {
  it('computes exact age for full dates', () => {
    expect(displayAge('1990-04-08', NOW)).toBe(36);
    expect(displayAge('1990-12-31', NOW)).toBe(35);
  });

  it('returns null for year-only values (no off-by-one ages)', () => {
    expect(displayAge('1990', NOW)).toBeNull();
    expect(displayAge('garbage', NOW)).toBeNull();
  });
});

describe('formatBirthDate', () => {
  it('renders long dates per locale, passes year-only through', () => {
    expect(formatBirthDate('1990-04-08', 'en')).toBe('April 8, 1990');
    expect(formatBirthDate('1990-04-08', 'de')).toBe('8. April 1990');
    expect(formatBirthDate('1990', 'de')).toBe('1990');
  });
});

describe('formatUsdRange', () => {
  it('renders compact USD ranges for en', () => {
    expect(formatUsdRange(3_000_000, 5_000_000, 'en')).toBe('$3M–$5M');
  });

  it('renders a single amount when high is null or not above low', () => {
    expect(formatUsdRange(2_500_000, null, 'en')).toBe('$2.5M');
    expect(formatUsdRange(2_500_000, 2_500_000, 'en')).toBe('$2.5M');
  });

  it('localizes for de', () => {
    // The exact spelling comes from ICU; assert the load-bearing parts
    // instead of the full string so an ICU update doesn't break the test.
    const range = formatUsdRange(3_000_000, 5_000_000, 'de');
    expect(range).toContain('3');
    expect(range).toContain('5');
    expect(range).toContain('–');
  });
});

describe('formatRegion', () => {
  it('resolves ISO codes per locale and falls back to the code', () => {
    expect(formatRegion('US', 'en')).toBe('United States');
    expect(formatRegion('DE', 'de')).toBe('Deutschland');
    expect(formatRegion('ZZ', 'en')).toBe('ZZ');
  });
});

describe('pickWikiArticle', () => {
  const en = { summary: 'EN', career: ['c'], personal_life: [], earnings: [] };
  const de = { summary: 'DE', career: ['k'], personal_life: [], earnings: [] };

  it('serves the native article only to matching viewer locales', () => {
    const wiki = { article: en, article_native: de, native_lang: 'de' };
    expect(pickWikiArticle(wiki, 'de')).toEqual({ article: de, lang: 'de' });
    expect(pickWikiArticle(wiki, 'en')).toEqual({ article: en, lang: 'en' });
    expect(pickWikiArticle(wiki, 'fr')).toEqual({ article: en, lang: 'en' });
  });

  it('serves EN when no native article exists', () => {
    const wiki = { article: en, article_native: null, native_lang: null };
    expect(pickWikiArticle(wiki, 'de')).toEqual({ article: en, lang: 'en' });
  });
});

describe('wikiMetaDescription', () => {
  it('collapses whitespace and keeps short summaries as-is', () => {
    expect(wikiMetaDescription('  Who\n is  X. ')).toBe('Who is X.');
  });

  it('cuts long summaries at a word boundary with an ellipsis', () => {
    const long = 'word '.repeat(60).trim();
    const out = wikiMetaDescription(long);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('wor…'); // no mid-word cut
  });
});

describe('avatarLargeUrl', () => {
  it('upsizes Twitch avatars to the 600px variant', () => {
    expect(
      avatarLargeUrl(
        'https://static-cdn.jtvnw.net/jtv_user_pictures/abc-123-profile_image-300x300.png',
      ),
    ).toBe('https://static-cdn.jtvnw.net/jtv_user_pictures/abc-123-profile_image-600x600.png');
  });

  it('upsizes YouTube avatars via the =s size param, keeping the suffix', () => {
    expect(
      avatarLargeUrl('https://yt3.googleusercontent.com/xyz=s176-c-k-c0x00ffffff-no-rj'),
    ).toBe('https://yt3.googleusercontent.com/xyz=s600-c-k-c0x00ffffff-no-rj');
  });

  it('passes unknown shapes and null through unchanged', () => {
    expect(avatarLargeUrl('https://example.com/pic.png')).toBe('https://example.com/pic.png');
    expect(avatarLargeUrl(null)).toBeNull();
  });
});

describe('bannerDisplayUrl', () => {
  it('appends a width directive to bare YouTube banner URLs', () => {
    expect(bannerDisplayUrl('https://yt3.googleusercontent.com/AbCdEf')).toBe(
      'https://yt3.googleusercontent.com/AbCdEf=w1707',
    );
  });

  it('never appends twice and leaves Twitch banners untouched', () => {
    expect(bannerDisplayUrl('https://yt3.googleusercontent.com/AbCdEf=w1707')).toBe(
      'https://yt3.googleusercontent.com/AbCdEf=w1707',
    );
    const twitch =
      'https://static-cdn.jtvnw.net/jtv_user_pictures/x-channel_offline_image-1920x1080.png';
    expect(bannerDisplayUrl(twitch)).toBe(twitch);
    expect(bannerDisplayUrl(null)).toBeNull();
  });
});

describe('wikiTopGames', () => {
  const statCat = (category: string): PublicStreamerStatsCategory => ({
    category,
    streams: 10,
    share_percent: 50,
  });
  const game = (category: string, boxArt: string | null): PublicGame => ({
    category,
    streamer_count: 5,
    box_art_url: boxArt,
  });

  it('joins stats categories against the catalog, keeps stats order', () => {
    const out = wikiTopGames(
      [statCat('Fortnite'), statCat('Call of Duty: Warzone')],
      [game('Call of Duty: Warzone', 'https://img/cod.jpg'), game('Fortnite', 'https://img/fn.jpg')],
    );
    expect(out.map((g) => g.category)).toEqual(['Fortnite', 'Call of Duty: Warzone']);
    expect(out[0]).toEqual({
      category: 'Fortnite',
      slug: 'fortnite',
      boxArtUrl: 'https://img/fn.jpg',
      sharePercent: 50,
    });
  });

  it('drops categories without a catalog game or without box art, respects limit', () => {
    const out = wikiTopGames(
      [statCat('Gaming'), statCat('No Art'), statCat('A'), statCat('B'), statCat('C')],
      [game('No Art', null), game('A', 'https://img/a.jpg'), game('B', 'https://img/b.jpg'), game('C', 'https://img/c.jpg')],
      2,
    );
    expect(out.map((g) => g.category)).toEqual(['A', 'B']);
  });

  it('returns empty on empty inputs', () => {
    expect(wikiTopGames([], [])).toEqual([]);
  });
});

describe('formatSharePercent', () => {
  it('formats the 0-100 integer share for the viewer locale', () => {
    expect(formatSharePercent(54, 'en')).toBe('54%');
    // de uses a narrow no-break space before the sign.
    expect(formatSharePercent(54, 'de')).toMatch(/^54\s%$/u);
  });
});
