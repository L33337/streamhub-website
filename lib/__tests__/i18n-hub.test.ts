import { describe, it, expect } from 'vitest';
import { UI_LANGS } from '../i18n-core';
import { buildRootGamesFaq, HUB_STRINGS, hubLexFor } from '../i18n-hub';
import type { HubLex } from '../i18n/hub/types';

const GAME = 'Minecraft';
const STAMP = '04:15 UTC';
const DATE_LABEL = 'Jul 18, 2026';

/**
 * Renders every lexicon entry with fixture arguments — [key, output]. Explicit
 * per-key invocation (not reflection) so the fixture types stay checked by the
 * compiler; a new HubLex key without an entry here fails code review, a missing
 * language fails the Record<UiLang, HubLex> type in lib/i18n-hub.ts.
 */
function renderAll(L: HubLex): Array<[string, string]> {
  return [
    ['crumbs.aria', L.crumbs.aria],
    ['crumbs.home', L.crumbs.home],
    ['crumbs.liveNow', L.crumbs.liveNow],
    ['crumbs.games', L.crumbs.games],
    ['crumbs.streamers', L.crumbs.streamers],
    ['crumbs.rankings', L.crumbs.rankings],
    ['crumbs.pageN', L.crumbs.pageN(3)],
    ['common.browseStreamersAZ', L.common.browseStreamersAZ],
    ['common.allGamesCategories', L.common.allGamesCategories],
    ['home.browseAllGames', L.home.browseAllGames],
    ['home.seeLiveNow', L.home.seeLiveNow],
    ['homeFeed.ticker.both', L.homeFeed.ticker(214, 38, 6)],
    ['homeFeed.ticker.liveOnly', L.homeFeed.ticker(3, 0, 6)],
    ['homeFeed.ticker.soonOnly', L.homeFeed.ticker(0, 5, 6)],
    ['homeFeed.liveTitle', L.homeFeed.liveTitle],
    ['homeFeed.liveFilterCategory', L.homeFeed.liveFilterCategory],
    ['homeFeed.liveFilterLanguage', L.homeFeed.liveFilterLanguage],
    ['homeFeed.liveFilterAllCategories', L.homeFeed.liveFilterAllCategories],
    ['homeFeed.liveFilterAllLanguages', L.homeFeed.liveFilterAllLanguages],
    ['homeFeed.liveFilterOption', L.homeFeed.liveFilterOption('Just Chatting', 7)],
    ['homeFeed.liveFilterMatches', L.homeFeed.liveFilterMatches(8)],
    ['homeFeed.liveFilterMatches.one', L.homeFeed.liveFilterMatches(1)],
    ['homeFeed.liveFilterReset', L.homeFeed.liveFilterReset],
    ['homeFeed.liveFilterEmpty', L.homeFeed.liveFilterEmpty],
    ['homeFeed.liveFilterNote', L.homeFeed.liveFilterNote(30, 133)],
    ['homeFeed.upNextTitle', L.homeFeed.upNextTitle],
    ['homeFeed.upNextLink', L.homeFeed.upNextLink],
    ['homeFeed.lineupFilterTime', L.homeFeed.lineupFilterTime],
    ['homeFeed.lineupFilterAllTimes', L.homeFeed.lineupFilterAllTimes],
    ['homeFeed.lineupFilterFrom', L.homeFeed.lineupFilterFrom('20:00')],
    ['homeFeed.lineupFilterMatches', L.homeFeed.lineupFilterMatches(8)],
    ['homeFeed.lineupFilterMatches.one', L.homeFeed.lineupFilterMatches(1)],
    ['homeFeed.lineupFilterEmpty', L.homeFeed.lineupFilterEmpty],
    ['homeFeed.chipAll', L.homeFeed.chipAll],
    ['homeFeed.chipFavorites', L.homeFeed.chipFavorites],
    ['homeFeed.lineupShowAll', L.homeFeed.lineupShowAll(24)],
    ['homeFeed.lineupShowMore', L.homeFeed.lineupShowMore(24)],
    ['homeFeed.lineupShowMore.one', L.homeFeed.lineupShowMore(1)],
    ['homeFeed.lineupShowLess', L.homeFeed.lineupShowLess],
    ['homeFeed.bellAria', L.homeFeed.bellAria('NachtFalke')],
    ['homeFeed.upsell.bellTitle', L.homeFeed.upsell.bellTitle],
    ['homeFeed.upsell.bellBody', L.homeFeed.upsell.bellBody],
    ['homeFeed.upsell.favoritesTitle', L.homeFeed.upsell.favoritesTitle],
    ['homeFeed.upsell.favoritesBody', L.homeFeed.upsell.favoritesBody],
    ['homeFeed.upsell.appCta', L.homeFeed.upsell.appCta],
    ['homeFeed.upsell.loginCta', L.homeFeed.upsell.loginCta],
    ['homeFeed.upsell.close', L.homeFeed.upsell.close],
    ['homeFeed.interrupt.title', L.homeFeed.interrupt.title],
    ['homeFeed.interrupt.body', L.homeFeed.interrupt.body],
    ['homeFeed.interrupt.note', L.homeFeed.interrupt.note],
    ['homeFeed.interrupt.appCta', L.homeFeed.interrupt.appCta],
    ['homeFeed.interrupt.loginCta', L.homeFeed.interrupt.loginCta],
    ['homeFeed.clipsTitle', L.homeFeed.clipsTitle],
    ['homeFeed.clipsFilterMatches', L.homeFeed.clipsFilterMatches(141)],
    ['homeFeed.clipsFilterMatches.one', L.homeFeed.clipsFilterMatches(1)],
    ['homeFeed.clipsFilterEmpty', L.homeFeed.clipsFilterEmpty],
    ['homeFeed.quickFactsTitle', L.homeFeed.quickFactsTitle],
    ['homeFeed.quickFactsSub', L.homeFeed.quickFactsSub],
    ['homeFeed.factPredictionLabel', L.homeFeed.factPredictionLabel],
    ['homeFeed.factPrediction', L.homeFeed.factPrediction(312, 359)],
    ['homeFeed.factPeakLabel', L.homeFeed.factPeakLabel],
    ['homeFeed.factPeak', L.homeFeed.factPeak('NachtFalke')],
    ['homeFeed.factReliableLabel', L.homeFeed.factReliableLabel],
    ['homeFeed.factReliable', L.homeFeed.factReliable('NachtFalke', 5, 5)],
    ['homeFeed.factPauseLabel', L.homeFeed.factPauseLabel],
    ['homeFeed.factPause', L.homeFeed.factPause('NachtFalke')],
    ['homeFeed.risersTitle', L.homeFeed.risersTitle],
    ['homeFeed.risersLink', L.homeFeed.risersLink],
    ['homeFeed.risersGained', L.homeFeed.risersGained('+12.4K')],
    ['homeFeed.mostStreamedTitle', L.homeFeed.mostStreamedTitle],
    ['homeFeed.weekHours', L.homeFeed.weekHours('42')],
    ['homeFeed.weekStreams', L.homeFeed.weekStreams(6)],
    ['homeFeed.mostWatchedTitle', L.homeFeed.mostWatchedTitle],
    ['homeFeed.topStreamersCol', L.homeFeed.topStreamersCol],
    ['homeFeed.topCategoriesCol', L.homeFeed.topCategoriesCol],
    ['homeFeed.medianViewers', L.homeFeed.medianViewers('24.1K')],
    ['homeFeed.hoursStreamed', L.homeFeed.hoursStreamed('1.2K')],
    ['homeFeed.followers', L.homeFeed.followers('412K')],
    ['homeFeed.missingStreamer', L.homeFeed.missingStreamer],
    ['homeFeed.endcap.title', L.homeFeed.endcap.title],
    ['homeFeed.endcap.bullets.0', L.homeFeed.endcap.bullets[0]],
    ['homeFeed.endcap.bullets.1', L.homeFeed.endcap.bullets[1]],
    ['homeFeed.endcap.bullets.2', L.homeFeed.endcap.bullets[2]],
    ['homeFeed.endcap.webLead', L.homeFeed.endcap.webLead],
    ['homeFeed.endcap.webLink', L.homeFeed.endcap.webLink],
    ['homeFeed.endcap.webTail', L.homeFeed.endcap.webTail],
    ['homeFeed.sessionBanner.text', L.homeFeed.sessionBanner.text],
    ['homeFeed.sessionBanner.cta', L.homeFeed.sessionBanner.cta],
    ['homeFeed.sectionNav.aria', L.homeFeed.sectionNav.aria],
    ['homeFeed.sectionNav.live', L.homeFeed.sectionNav.live],
    ['homeFeed.sectionNav.lineup', L.homeFeed.sectionNav.lineup],
    ['homeFeed.sectionNav.trending', L.homeFeed.sectionNav.trending],
    ['homeFeed.sectionNav.clips', L.homeFeed.sectionNav.clips],
    ['homeFeed.sectionNav.stats', L.homeFeed.sectionNav.stats],
    ['homeFeed.sectionNav.discover', L.homeFeed.sectionNav.discover],
    ['hero.claim', L.hero.claim],
    // The CTA fragments render as one sentence with two inline links; assert
    // the assembled line (the segments carry the significant spacing).
    [
      'hero.cta',
      `${L.hero.ctaLogin}${L.hero.ctaMid}${L.hero.ctaApp}${L.hero.ctaTail}`,
    ],
    ['hero.ctaAppOnly', `${L.hero.ctaAppOnlyLink}${L.hero.ctaAppOnlyTail}`],
    ['hero.kicker', L.hero.kicker],
    ['hero.badgeNew', L.hero.badgeNew],
    ['hero.badgeLive', L.hero.badgeLive],
    // Lead/tail render around the brand fragment; either part may be '' on its
    // own, so assert the assembled H1 instead of the raw parts.
    ['hero.title', `${L.hero.titleLead}Twitch & YouTube${L.hero.titleTail}`],
    ['hero.subtitle', L.hero.subtitle],
    ['hero.bodyLead', L.hero.bodyLead],
    ['hero.bodyLink', L.hero.bodyLink],
    ['hero.bodyTail', L.hero.bodyTail],
    ['hero.appStoreSub', L.hero.appStoreSub],
    ['hero.playSub', L.hero.playSub],
    ['hero.phoneAlt', L.hero.phoneAlt],
    ['hero.phoneCaption', L.hero.phoneCaption],
    ['hero.statBothLabel', L.hero.statBothLabel],
    ['hero.statFavoritesValue', L.hero.statFavoritesValue],
    ['hero.statFavoritesLabel', L.hero.statFavoritesLabel],
    ['hero.statApiValue', L.hero.statApiValue],
    ['hero.statApiLabel', L.hero.statApiLabel],
    ['upcoming.heading', L.upcoming.heading],
    ['upcoming.aria', L.upcoming.aria],
    ['upcoming.empty', L.upcoming.empty],
    ['trending.heading', L.trending.heading],
    ['trending.subtitle', L.trending.subtitle],
    ['trending.aria', L.trending.aria],
    ['trending.rankOnTwitch', L.trending.rankOnTwitch(3)],
    ['trending.sortAria', L.trending.sortAria],
    ['trending.sortTwitch', L.trending.sortTwitch],
    ['trending.sortHours', L.trending.sortHours],
    ['trending.sortViewers', L.trending.sortViewers],
    ['trending.sortStreamers', L.trending.sortStreamers],
    ['trending.liveViewers', L.trending.liveViewers('16.3K')],
    ['trending.streamerCount', L.trending.streamerCount('242', 242)],
    ['trending.streamerCount.few', L.trending.streamerCount('3', 3)],
    ['trending.streamerCount.one', L.trending.streamerCount('1', 1)],
    ['popular.heading', L.popular.heading],
    ['popular.viewAll', L.popular.viewAll],
    ['apiPromo.heading', L.apiPromo.heading],
    ['apiPromo.comingSoon', L.apiPromo.comingSoon],
    ['apiPromo.eyebrow', L.apiPromo.eyebrow],
    ['apiPromo.headlineLead', L.apiPromo.headlineLead],
    ['apiPromo.headlineKey', L.apiPromo.headlineKey],
    ['apiPromo.body', L.apiPromo.body],
    ['apiPromo.bullets.0', L.apiPromo.bullets[0]],
    ['apiPromo.bullets.1', L.apiPromo.bullets[1]],
    ['apiPromo.bullets.2', L.apiPromo.bullets[2]],
    ['apiPromo.bullets.3', L.apiPromo.bullets[3]],
    ['apiPromo.cta', L.apiPromo.cta],
    ['live.h1', L.live.h1],
    ['live.intro.3-2-1', L.live.intro(3, 2, 1, 6)],
    ['live.intro.1-1-0', L.live.intro(1, 1, 0, 6)],
    ['live.intro.5-0-2', L.live.intro(5, 0, 2, 6)],
    ['live.intro.21-11-5', L.live.intro(21, 11, 5, 6)],
    ['live.introEmpty', L.live.introEmpty],
    ['live.error', L.live.error],
    ['live.otherCategory', L.live.otherCategory],
    ['live.categoryLiveAria', L.live.categoryLiveAria(GAME)],
    ['live.nLive', L.live.nLive(4)],
    ['live.startingSoon', L.live.startingSoon],
    ['live.nextNHours', L.live.nextNHours(6)],
    ['live.emptyAll', L.live.emptyAll],
    ['live.itemListName', L.live.itemListName],
    ['streamers.h1', L.streamers.h1],
    ['streamers.intro', L.streamers.intro],
    ['streamers.pageOf', L.streamers.pageOf(2, 5)],
    ['streamers.error', L.streamers.error],
    ['streamers.paginationAria', L.streamers.paginationAria],
    ['streamers.prev', L.streamers.prev],
    ['streamers.next', L.streamers.next],
    ['games.liveRightNow', L.games.liveRightNow],
    ['games.liveAria', L.games.liveAria],
    ['games.error', L.games.error],
    ['games.aboutHeading', L.games.aboutHeading],
    ['games.updatedAt', L.games.updatedAt(STAMP)],
    ['games.relatedAria', L.games.relatedAria],
    ['gamesRoot.h1', L.gamesRoot.h1],
    ['gamesRoot.methodologyNote', L.gamesRoot.methodologyNote],
    ['gamesRoot.intro.live', L.gamesRoot.intro(260, 14, 9)],
    ['gamesRoot.intro.one', L.gamesRoot.intro(1, 1, 1)],
    ['gamesRoot.intro.cold', L.gamesRoot.intro(260, 0, 0)],
    ['gamesRoot.faqPopularQ', L.gamesRoot.faqPopularQ],
    [
      'gamesRoot.faqPopularA.second',
      L.gamesRoot.faqPopularA({ category: GAME, count: 24 }, { category: 'Fortnite', count: 18 }),
    ],
    ['gamesRoot.faqPopularA.solo', L.gamesRoot.faqPopularA({ category: GAME, count: 1 }, null)],
    ['gamesRoot.faqWhoQ', L.gamesRoot.faqWhoQ],
    ['gamesRoot.faqWhoA', L.gamesRoot.faqWhoA(14, 9)],
    ['gamesRoot.faqWhoA.one', L.gamesRoot.faqWhoA(1, 1)],
    ['gamesRoot.faqRankedQ', L.gamesRoot.faqRankedQ],
    ['gamesRoot.faqRankedA', L.gamesRoot.faqRankedA(260)],
    ['gamesRoot.faqHoursQ', L.gamesRoot.faqHoursQ],
    ['gamesRoot.faqHoursA', L.gamesRoot.faqHoursA],
    ['rankings.h1', L.rankings.h1],
    ['rankings.intro', L.rankings.intro(5)],
    ['rankings.dataRefreshed', L.rankings.dataRefreshed(DATE_LABEL)],
    ['rankings.statStreamersTracked', L.rankings.statStreamersTracked],
    ['rankings.statLiveNow', L.rankings.statLiveNow],
    ['rankings.statGamesCategories', L.rankings.statGamesCategories],
    ['rankings.seeFullRanking', L.rankings.seeFullRanking],
    ['rankings.warmingUp', L.rankings.warmingUp],
    ['rankings.byGameHeading', L.rankings.byGameHeading],
    ['rankings.byGameSubtitle', L.rankings.byGameSubtitle],
    ['rankings.byGameAria', L.rankings.byGameAria],
    ['rankings.topGameStreamers', L.rankings.topGameStreamers(GAME)],
    ['rankings.whoIsLive', L.rankings.whoIsLive],
    ['rankings.metricH1.most-followed', L.rankings.metricH1['most-followed']],
    ['rankings.metricH1.fastest-growing', L.rankings.metricH1['fastest-growing']],
    ['rankings.metricH1.most-watched', L.rankings.metricH1['most-watched']],
    ['rankings.metricH1.most-active', L.rankings.metricH1['most-active']],
    ['rankings.metricH1.most-reliable', L.rankings.metricH1['most-reliable']],
    ['rankings.metricNote.most-followed', L.rankings.metricNote['most-followed']],
    ['rankings.metricNote.fastest-growing', L.rankings.metricNote['fastest-growing']],
    ['rankings.metricNote.most-watched', L.rankings.metricNote['most-watched']],
    ['rankings.metricNote.most-active', L.rankings.metricNote['most-active']],
    ['rankings.metricNote.most-reliable', L.rankings.metricNote['most-reliable']],
  ];
}

// Broken interpolation / missing values must never reach rendered HTML.
const BROKEN = /undefined|\bNaN\b|\$\{|\[object/;

describe('HUB_STRINGS lexica', () => {
  it.each([...UI_LANGS])('%s renders every key as clean non-empty text', (lang) => {
    for (const [key, value] of renderAll(HUB_STRINGS[lang])) {
      expect(value.trim(), `${lang}:${key} empty`).not.toBe('');
      expect(value, `${lang}:${key} broken: "${value}"`).not.toMatch(BROKEN);
    }
  });

  it.each([...UI_LANGS])('%s embeds the counts in the homeFeed ticker', (lang) => {
    const ticker = HUB_STRINGS[lang].homeFeed.ticker(214, 38, 6);
    expect(ticker).toContain('214');
    expect(ticker).toContain('38');
    expect(HUB_STRINGS[lang].homeFeed.ticker(7, 0, 6)).toContain('7');
    expect(HUB_STRINGS[lang].homeFeed.ticker(0, 9, 6)).toContain('9');
  });

  // The note carries the section's whole promise: what you see (the cut) and
  // what the dropdowns actually search (the pool). A translation that drops
  // one of the two numbers reads as the old, narrower behaviour.
  it.each([...UI_LANGS])('%s states cut and pool in the live filter note', (lang) => {
    const note = HUB_STRINGS[lang].homeFeed.liveFilterNote(30, 133);
    expect(note).toContain('30');
    expect(note).toContain('133');
  });

  // The lineup's time options are the one place a lexicon string wraps a
  // pre-formatted clock reading — a translation that drops the placeholder
  // would render "From" with no time at all.
  it.each([...UI_LANGS])('%s keeps the clock reading in the time option', (lang) => {
    expect(HUB_STRINGS[lang].homeFeed.lineupFilterFrom('20:00')).toContain('20:00');
  });

  // Predictions are not running yet, so the lineup counter must not reuse the
  // live rail's "live" wording, and it has to agree with the count.
  it.each([...UI_LANGS])('%s counts lineup matches without saying live', (lang) => {
    const L = HUB_STRINGS[lang].homeFeed;
    expect(L.lineupFilterMatches(8)).toContain('8');
    expect(L.lineupFilterMatches(1)).toContain('1');
    expect(L.lineupFilterMatches(1).toLowerCase()).not.toContain('live');
    expect(L.lineupFilterEmpty.toLowerCase()).not.toContain('live');
  });

  // The clips counter shares its dropdowns with the live rail but not its
  // noun: these are recorded highlights, so a translation that borrows the
  // live wording would claim the rail is showing running streams.
  it.each([...UI_LANGS])('%s counts clip matches without saying live', (lang) => {
    const L = HUB_STRINGS[lang].homeFeed;
    expect(L.clipsFilterMatches(141)).toContain('141');
    expect(L.clipsFilterMatches(1)).toContain('1');
    expect(L.clipsFilterMatches(1).toLowerCase()).not.toContain('live');
    expect(L.clipsFilterEmpty.toLowerCase()).not.toContain('live');
  });

  // The trending rail's metric lines carry the number the sort is based on —
  // a translation that drops the placeholder would show a bare noun. The
  // streamer count additionally has to agree with the count it is given
  // (Slavic/Arabic plural categories).
  it.each([...UI_LANGS])('%s embeds the value in the trending metrics', (lang) => {
    const L = HUB_STRINGS[lang].trending;
    expect(L.liveViewers('16.3K')).toContain('16.3K');
    expect(L.streamerCount('242', 242)).toContain('242');
    expect(L.streamerCount('3', 3)).toContain('3');
  });

  // hours_28d is time BROADCAST (lib/games-sort.ts invariant): the hours sort
  // must never borrow the viewers sort's wording in any language.
  it.each([...UI_LANGS])('%s keeps hours and viewers sorts distinct', (lang) => {
    const L = HUB_STRINGS[lang].trending;
    expect(L.sortHours).not.toBe(L.sortViewers);
    expect(L.sortHours.toLowerCase()).not.toContain('watch');
  });

  // The four sort buttons share ONE row on a 390px phone — they scroll rather
  // than wrap, so a long translation doesn't break the layout, it hides the
  // last option. Widest today is "Espectadores" (12). CJK glyphs are ~2x the
  // width of a latin character, so they count double.
  it.each([...UI_LANGS])('%s keeps the sort labels inside the row budget', (lang) => {
    const L = HUB_STRINGS[lang].trending;
    const width = (s: string) =>
      [...s].reduce((n, ch) => n + (/[　-鿿＀-￯]/.test(ch) ? 2 : 1), 0);
    for (const label of [L.sortTwitch, L.sortHours, L.sortViewers, L.sortStreamers]) {
      expect(width(label)).toBeLessThanOrEqual(14);
    }
  });

  it.each([...UI_LANGS])('%s embeds the counts in the live intro', (lang) => {
    const intro = HUB_STRINGS[lang].live.intro(7, 4, 3, 6);
    expect(intro).toContain('7');
    expect(intro).toContain('4');
    expect(intro).toContain('3');
    expect(intro).toContain('6');
  });

  it('hubLexFor falls back to English for unknown locales', () => {
    expect(hubLexFor('ko')).toBe(HUB_STRINGS.en);
    expect(hubLexFor(null)).toBe(HUB_STRINGS.en);
    expect(hubLexFor('other')).toBe(HUB_STRINGS.en);
    expect(hubLexFor('de-AT')).toBe(HUB_STRINGS.de);
    expect(hubLexFor('de')).toBe(HUB_STRINGS.de);
  });

  it('buildRootGamesFaq mirrors the EN builder emission rules', () => {
    const L = HUB_STRINGS.en;
    const full = buildRootGamesFaq(L, {
      gameCount: 260,
      liveStreamerCount: 14,
      liveGameCount: 9,
      top: { category: GAME, count: 24 },
      second: { category: 'Fortnite', count: 18 },
    });
    expect(full.map((f) => f.q)).toEqual([
      L.gamesRoot.faqPopularQ,
      L.gamesRoot.faqWhoQ,
      L.gamesRoot.faqRankedQ,
      L.gamesRoot.faqHoursQ,
    ]);
    // No top entry / nobody live → only the two static questions remain.
    const cold = buildRootGamesFaq(L, {
      gameCount: 260,
      liveStreamerCount: 0,
      liveGameCount: 0,
      top: null,
      second: null,
    });
    expect(cold.map((f) => f.q)).toEqual([L.gamesRoot.faqRankedQ, L.gamesRoot.faqHoursQ]);
  });
});

describe('English lexicon regression guard (legacy hardcoded strings)', () => {
  const L = HUB_STRINGS.en;

  it('pins the homepage masthead copy (rebuild round 2, 2026-07-27)', () => {
    expect(L.hero.claim).toBe('Stream Schedule. Highlights. Stats. All in One Place.');
    expect(`${L.hero.ctaLogin}${L.hero.ctaMid}${L.hero.ctaApp}${L.hero.ctaTail}`).toBe(
      'Log in or get the App to follow your favorite streamers.',
    );
    expect(`${L.hero.ctaAppOnlyLink}${L.hero.ctaAppOnlyTail}`).toBe(
      'Get the App to follow your favorite streamers.',
    );
  });

  it('keeps the previously hardcoded copy byte-identical', () => {
    // HomeHero
    expect(`${L.hero.titleLead}Twitch & YouTube${L.hero.titleTail}`).toBe(
      'Live stream schedule for Twitch & YouTube',
    );
    expect(L.hero.subtitle).toBe('The TV guide for streamers.');
    expect(L.hero.bodyLead).toBe(
      'One feed for Twitch and YouTube. Real-time live status, AI-predicted next slots, and zero noise. Free, no account required —',
    );
    expect(L.hero.bodyLink).toBe('get the app');
    expect(L.hero.appStoreSub).toBe('Download on the');
    expect(L.hero.playSub).toBe('GET IT ON');
    expect(L.hero.phoneCaption).toBe('Checking tonight’s lineup');
    expect(L.hero.statApiLabel).toBe('Coming soon · join the waitlist');
    // Homepage body links
    expect(L.home.browseAllGames).toBe('Browse all games & categories →');
    expect(L.home.seeLiveNow).toBe("See everyone who's live right now →");
    expect(L.upcoming.heading).toBe('Coming up next');
    expect(L.upcoming.empty).toBe('Nothing scheduled right now — check back soon.');
    expect(L.trending.heading).toBe('Trending on Twitch');
    expect(L.trending.rankOnTwitch(3)).toBe('#3 on Twitch');
    expect(L.popular.heading).toBe('Popular streamers');
    expect(L.popular.viewAll).toBe('View all streamers →');
    expect(L.apiPromo.headlineLead).toBe('Build with the same data —');
    expect(L.apiPromo.headlineKey).toBe('soon, on our API.');
    expect(L.apiPromo.bullets[2]).toBe('Webhooks for “went live” events');
    // /live
    expect(L.live.h1).toBe('Live now on Twitch & YouTube');
    expect(L.live.intro(3, 2, 1)).toBe(
      '3 streamers are live right now across 2 games and categories. 1 more is scheduled to start in the next 6 hours.',
    );
    expect(L.live.intro(1, 0, 0)).toBe('1 streamer is live right now.');
    expect(L.live.intro(1, 1, 2, 6)).toBe(
      '1 streamer is live right now across 1 game and categories. 2 more are scheduled to start in the next 6 hours.',
    );
    expect(L.live.introEmpty).toBe(
      "No streamers are live right now — here's who's starting soon.",
    );
    expect(L.live.nLive(4)).toBe('4 live');
    expect(L.live.nextNHours(6)).toBe('next 6 hours');
    expect(L.live.categoryLiveAria('Minecraft')).toBe('Minecraft — live now');
    expect(L.live.itemListName).toBe('Streamers live right now on Twitch & YouTube');
    // /streamers
    expect(L.streamers.h1).toBe('All Twitch & YouTube streamers A–Z');
    expect(L.streamers.intro).toBe(
      'Every streamer tracked on Streamer Times — see who is live now and what they stream next. Browse the full list page by page.',
    );
    expect(L.streamers.pageOf(2, 5)).toBe('Page 2 of 5.');
    expect(L.streamers.prev).toBe('← Previous');
    expect(L.streamers.next).toBe('Next →');
    // /games (root view mirrors the lib/games-hub.ts registry + builders)
    expect(L.games.aboutHeading).toBe('About these games');
    expect(L.games.updatedAt('04:15 UTC')).toBe('Updated 04:15 UTC.');
    expect(L.common.allGamesCategories).toBe('All games & categories');
    expect(L.common.browseStreamersAZ).toBe('Browse all streamers A–Z');
    expect(L.gamesRoot.h1).toBe('Most popular games on Twitch & YouTube');
    expect(L.gamesRoot.methodologyNote).toBe(
      'Ordered by how many streamers we track in each category over the last 28 days.',
    );
    expect(L.gamesRoot.intro(260, 14, 9)).toBe(
      'We track 260 games and categories across Twitch and YouTube. 14 streamers are live right now across 9 categories. Ordered by how many streamers we track in each category over the last 28 days.',
    );
    expect(L.gamesRoot.intro(260, 0, 0)).toBe(
      'We track 260 games and categories across Twitch and YouTube. Ordered by how many streamers we track in each category over the last 28 days.',
    );
    expect(
      L.gamesRoot.faqPopularA({ category: 'Minecraft', count: 24 }, { category: 'Fortnite', count: 18 }),
    ).toBe(
      'Minecraft has the most streamers we track — 24 channels streamed it in the last 28 days, ahead of Fortnite with 18.',
    );
    // /rankings (metric copy mirrors the lib/rankings.ts registry)
    expect(L.rankings.h1).toBe('Streamer rankings');
    expect(L.rankings.intro(5)).toBe(
      'Who are the biggest, fastest growing, busiest and most dependable streamers on Twitch and YouTube? 5 leaderboards over every streamer we track — updated daily from real broadcast data.',
    );
    expect(L.rankings.dataRefreshed('Jul 18, 2026')).toBe(' Data refreshed Jul 18, 2026.');
    expect(L.rankings.seeFullRanking).toBe('See the full ranking →');
    expect(L.rankings.topGameStreamers('Minecraft')).toBe('Top Minecraft streamers');
    expect(L.rankings.metricH1['most-followed']).toBe('Most followed streamers');
    expect(L.rankings.metricH1['most-reliable']).toBe('Most punctual streamers');
    expect(L.rankings.metricNote['most-watched']).toBe(
      'Median concurrent live viewers over the last 28 days (hourly sampling). Updated daily.',
    );
  });

  it('mirrors the RANKING_PAGES registry byte-for-byte', async () => {
    const { RANKING_PAGES } = await import('../rankings');
    for (const spec of RANKING_PAGES) {
      expect(L.rankings.metricH1[spec.metric], spec.metric).toBe(spec.h1);
      expect(L.rankings.metricNote[spec.metric], spec.metric).toBe(spec.methodologyNote);
    }
  });

  it('mirrors the root games-hub registry and builders byte-for-byte', async () => {
    const { DEFAULT_GAMES_HUB_VIEW, buildGamesHubIntro } = await import('../games-hub');
    expect(L.gamesRoot.h1).toBe(DEFAULT_GAMES_HUB_VIEW.h1);
    expect(L.gamesRoot.methodologyNote).toBe(DEFAULT_GAMES_HUB_VIEW.methodologyNote);
    const meta = { gameCount: 260, totalHours28d: null };
    for (const live of [
      { liveGameCount: 9, liveStreamerCount: 14 },
      { liveGameCount: 1, liveStreamerCount: 1 },
      { liveGameCount: 0, liveStreamerCount: 0 },
      { liveGameCount: 0, liveStreamerCount: 3 },
    ]) {
      expect(L.gamesRoot.intro(meta.gameCount, live.liveStreamerCount, live.liveGameCount)).toBe(
        buildGamesHubIntro(DEFAULT_GAMES_HUB_VIEW, meta, live),
      );
    }
  });
});
