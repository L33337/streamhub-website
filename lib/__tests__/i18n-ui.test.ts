import { describe, it, expect } from 'vitest';
import { UI_LANGS } from '../i18n-core';
import { UI_STRINGS, uiLexFor } from '../i18n-ui';
import type { UiLex } from '../i18n/types';

const NAME = 'TestStreamer';
const TIMES = { start: '19:00', end: '23:30', tzLabel: 'Berlin time' };

/**
 * Renders every lexicon entry with fixture arguments — [key, output]. Explicit
 * per-key invocation (not reflection) so the fixture types stay checked by the
 * compiler; a new UiLex key without an entry here fails code review, a missing
 * language fails the Record<UiLang, UiLex> type in lib/i18n-ui.ts.
 */
function renderAll(L: UiLex): Array<[string, string]> {
  return [
    ['breadcrumb.home', L.breadcrumb.home],
    ['breadcrumb.streamers', L.breadcrumb.streamers],
    ['hero.featured', L.hero.featured],
    ['hero.nowStreaming', L.hero.nowStreaming],
    ['hero.avatarAlt', L.hero.avatarAlt(NAME)],
    ['promo.valueProps.0', L.promo.valueProps[0]],
    ['promo.valueProps.1', L.promo.valueProps[1]],
    ['promo.valueProps.2', L.promo.valueProps[2]],
    ['promo.qrAria', L.promo.qrAria],
    ['promo.getApp', L.promo.getApp],
    ['lastStream.heading', L.lastStream.heading],
    ['lastStream.pastStream', L.lastStream.pastStream],
    ['lastStream.watchVod', L.lastStream.watchVod],
    ['lastStream.watchAria', L.lastStream.watchAria(NAME, 'My VOD title')],
    ['recent.heading', L.recent.heading],
    ['recent.vodAria', L.recent.vodAria('My VOD title')],
    ['channelStats.heading', L.channelStats.heading],
    ['channelStats.followers', L.channelStats.followers],
    ['channelStats.subscribers', L.channelStats.subscribers],
    ['channelStats.avgViewers', L.channelStats.avgViewers],
    ['channelStats.medianDetail', L.channelStats.medianDetail],
    ['channelStats.peakViewers', L.channelStats.peakViewers],
    ['channelStats.hoursStreamed', L.channelStats.hoursStreamed],
    ['channelStats.lastNDays', L.channelStats.lastNDays(28)],
    ['stats.heading', L.stats.heading(NAME)],
    ['stats.caption', L.stats.caption(NAME, 'Berlin time')],
    ['stats.colDay', L.stats.colDay],
    ['stats.colTime', L.stats.colTime],
    ['stats.colDuration', L.stats.colDuration],
    ['stats.usuallyNoStream', L.stats.usuallyNoStream],
    ['stats.streamsPerWeek', L.stats.streamsPerWeek],
    ['stats.typicalLength', L.stats.typicalLength],
    ['stats.topCategories', L.stats.topCategories],
    ['stats.basedOn', L.stats.basedOn(23, 28)],
    ['stats.allTimesIn', L.stats.allTimesIn('Berlin time')],
    ['stats.cityTime', L.stats.cityTime('Berlin')],
    ['stats.leadSentence.times', L.stats.leadSentence(NAME, 3, TIMES)],
    ['stats.leadSentence.oneDay', L.stats.leadSentence(NAME, 1, null)],
    ['faq.heading', L.faq.heading],
    ['faq.qIsLive', L.faq.qIsLive(NAME)],
    ['faq.aIsLiveCat', L.faq.aIsLiveCat(NAME, 'Minecraft', 'Twitch')],
    ['faq.aIsLive', L.faq.aIsLive(NAME, 'Twitch')],
    ['faq.qUsually', L.faq.qUsually(NAME)],
    ['faq.typicallyLast', L.faq.typicallyLast('3h 15m')],
    ['faq.qSchedule', L.faq.qSchedule(NAME)],
    ['faq.aScheduleLead.1', L.faq.aScheduleLead(NAME, 1)],
    ['faq.aScheduleLead.2', L.faq.aScheduleLead(NAME, 2)],
    ['faq.aScheduleLead.5', L.faq.aScheduleLead(NAME, 5)],
    ['faq.aScheduleLead.21', L.faq.aScheduleLead(NAME, 21)],
    ['faq.nextUp', L.faq.nextUp('Sat 20:00 UTC (Minecraft)')],
    ['faq.afterThat', L.faq.afterThat('Sun 20:00 UTC; Mon 19:00 UTC')],
    ['faq.plusMore.1', L.faq.plusMore(1)],
    ['faq.plusMore.3', L.faq.plusMore(3)],
    ['faq.predictedNote', L.faq.predictedNote],
    ['faq.outsideDates', L.faq.outsideDates(NAME, '20:00', 'Berlin time')],
    ['faq.predictedMarker', L.faq.predictedMarker],
    ['faq.qGames', L.faq.qGames(NAME)],
    ['faq.aGamesOne', L.faq.aGamesOne(NAME, 'Minecraft')],
    ['faq.aGamesMany', L.faq.aGamesMany(NAME, 'Minecraft, Fortnite')],
    ['faq.qHowOften', L.faq.qHowOften(NAME)],
    ['faq.aAlwaysOn', L.faq.aAlwaysOn(NAME, 'Twitch')],
    ['faq.aPerWeek', L.faq.aPerWeek(NAME, 3.5, 28)],
    ['faq.aScheduleCount.days', L.faq.aScheduleCount(NAME, 5, 'Monday and Friday')],
    ['faq.aScheduleCount.noDays', L.faq.aScheduleCount(NAME, 1, null)],
    ['faq.qWhere', L.faq.qWhere(NAME)],
    ['faq.aWhere', L.faq.aWhere(NAME, 'Twitch')],
    ['faq.qTimezone', L.faq.qTimezone(NAME)],
    ['faq.aTimezone', L.faq.aTimezone(NAME, 'New York')],
    ['faq.qPredicted', L.faq.qPredicted(NAME)],
    ['faq.aAllPredicted', L.faq.aAllPredicted(NAME)],
    ['faq.aMixed', L.faq.aMixed(NAME, 2, 5)],
    ['empty.heading', L.empty.heading],
    ['empty.body', L.empty.body(NAME, 'Twitch and YouTube')],
    ['empty.browseAll', L.empty.browseAll],
    ['related.heading', L.related.heading],
    ['related.liveNowSr', L.related.liveNowSr],
    ['games.heading', L.games.heading],
    ['games.navAria', L.games.navAria],
  ];
}

// Broken interpolation / missing values must never reach rendered HTML.
const BROKEN = /undefined|\bNaN\b|\$\{|\[object/;

describe('UI_STRINGS lexica', () => {
  it.each([...UI_LANGS])('%s renders every key as clean non-empty text', (lang) => {
    for (const [key, value] of renderAll(UI_STRINGS[lang])) {
      expect(value.trim(), `${lang}:${key} empty`).not.toBe('');
      expect(value, `${lang}:${key} broken: "${value}"`).not.toMatch(BROKEN);
    }
  });

  it.each([...UI_LANGS])('%s embeds the streamer name in every FAQ question', (lang) => {
    const F = UI_STRINGS[lang].faq;
    const questions = [
      F.qIsLive,
      F.qUsually,
      F.qSchedule,
      F.qGames,
      F.qHowOften,
      F.qWhere,
      F.qTimezone,
      F.qPredicted,
    ];
    for (const q of questions) {
      expect(q(NAME), lang).toContain(NAME);
    }
  });

  it('uiLexFor falls back to English for unknown languages', () => {
    expect(uiLexFor('ko')).toBe(UI_STRINGS.en);
    expect(uiLexFor(null)).toBe(UI_STRINGS.en);
    expect(uiLexFor('other')).toBe(UI_STRINGS.en);
    expect(uiLexFor('de-AT')).toBe(UI_STRINGS.de);
  });
});

describe('English lexicon regression guard (legacy hardcoded strings)', () => {
  const L = UI_STRINGS.en;

  it('keeps the previously hardcoded copy byte-identical', () => {
    expect(L.stats.heading(NAME)).toBe(`When does ${NAME} stream?`);
    expect(L.stats.leadSentence(NAME, 3, TIMES)).toBe(
      `${NAME} usually streams 3 days per week, typically between 19:00 and 23:30 (Berlin time).`,
    );
    expect(L.stats.leadSentence(NAME, 1, null)).toBe(
      `${NAME} usually streams 1 day per week.`,
    );
    expect(L.stats.basedOn(23, 28)).toBe('Based on 23 streams over the last 28 days.');
    expect(L.stats.allTimesIn('Berlin time')).toBe('All times shown in Berlin time');
    expect(L.stats.cityTime('Berlin')).toBe('Berlin time');
    expect(L.faq.aScheduleLead(NAME, 1)).toBe(
      `${NAME} has 1 stream on the schedule for the next 7 days.`,
    );
    expect(L.faq.aScheduleLead(NAME, 4)).toBe(
      `${NAME} has 4 streams on the schedule for the next 7 days.`,
    );
    expect(L.faq.aScheduleCount(NAME, 2, 'Monday and Friday')).toBe(
      `${NAME} has 2 streams on the schedule for the next 7 days, on Monday and Friday.`,
    );
    expect(L.empty.body(NAME, 'Twitch and YouTube')).toBe(
      `We track ${NAME}'s livestreams on Twitch and YouTube. AI predictions and confirmed schedules will appear here once enough history is collected.`,
    );
    expect(L.breadcrumb.streamers).toBe('Streamers');
    expect(L.faq.heading).toBe('Frequently asked questions');
    expect(L.channelStats.lastNDays(28)).toBe('last 28 days');
  });
});
