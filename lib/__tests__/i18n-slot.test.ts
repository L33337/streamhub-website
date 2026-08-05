import { describe, it, expect } from 'vitest';
import { UI_LANGS } from '../i18n-core';
import { SLOT_STRINGS, slotLexFor, type SlotLex } from '../i18n-slot';

const NAME = 'TestStreamer';

/** Every slot-lexicon entry rendered with fixture args — [key, output]. */
function renderAll(L: SlotLex): Array<[string, string]> {
  return [
    ['statusLiveSince', L.statusLiveSince('2 hours')],
    ['statusEndsIn', L.statusEndsIn('~2h')],
    ['statusAround', L.statusAround('10pm your time · 12am CEST')],
    ['statusYourTime', L.statusYourTime('10pm')],
    ['statusWasExpected', L.statusWasExpected('10pm · 12am CEST')],
    ['statusOffline', L.statusOffline],
    ['confidencePrefix', L.confidencePrefix],
    ['confidenceLabels.high', L.confidenceLabels.high],
    ['confidenceLabels.medium', L.confidenceLabels.medium],
    ['confidenceLabels.low', L.confidenceLabels.low],
    ['confidenceAria.high', L.confidenceAria('high')],
    ['confidenceAria.medium', L.confidenceAria('medium')],
    ['confidenceAria.low', L.confidenceAria('low')],
    ['liveBadgeAria', L.liveBadgeAria],
    ['nStreams.1', L.nStreams(1)],
    ['nStreams.2', L.nStreams(2)],
    ['nStreams.5', L.nStreams(5)],
    ['nStreams.21', L.nStreams(21)],
    ['jumpToDayAria', L.jumpToDayAria],
    ['streamsOnAria', L.streamsOnAria('Today')],
    ['noStreamsExpected', L.noStreamsExpected],
    ['favoriteAria.name', L.favoriteAria(NAME)],
    ['favoriteAria.none', L.favoriteAria(undefined)],
    ['signInToFavoriteAria.name', L.signInToFavoriteAria(NAME)],
    ['signInToFavoriteAria.none', L.signInToFavoriteAria(undefined)],
    ['saveInAppAria.name', L.saveInAppAria(NAME)],
    ['saveInAppAria.none', L.saveInAppAria(undefined)],
    ['signInTitle', L.signInTitle],
    ['saveInAppTitle', L.saveInAppTitle],
    ['addToFavorites', L.addToFavorites],
    ['removeFromFavorites', L.removeFromFavorites],
    ['watchOnTwitch', L.watchOnTwitch],
    ['watchOnYouTube', L.watchOnYouTube],
    ['opensInNewTab', L.opensInNewTab],
    ['whyThisPrediction', L.whyThisPrediction],
    ['autoSummary', L.autoSummary],
    ['nextStreamPrefix', L.nextStreamPrefix],
    ['showMoreStreams', L.showMoreStreams(6)],
    ['showFewerStreams', L.showFewerStreams],
    ['nextTimePredictedTitle', L.nextTimePredictedTitle],
    ['nextTimeAnnouncedTitle', L.nextTimeAnnouncedTitle],
    // M22 S4.1: GameCard stat lines
    ['gameLiveBadge', L.gameLiveBadge(3)],
    ['gameStreamerCount.1', L.gameStreamerCount(1)],
    ['gameStreamerCount.2', L.gameStreamerCount(2)],
    ['gameStreamerCount.5', L.gameStreamerCount(5)],
    ['gameStreamerCount.21', L.gameStreamerCount(21)],
    ['gameHoursShort', L.gameHoursShort('1.2K')],
    ['gameWatchingNow', L.gameWatchingNow('16.3K')],
    ['gameTrendTitle', L.gameTrendTitle],
  ];
}

const BROKEN = /undefined|\bNaN\b|\$\{|\[object/;

describe('SLOT_STRINGS lexica', () => {
  it.each([...UI_LANGS])('%s renders every key as clean non-empty text', (lang) => {
    for (const [key, value] of renderAll(SLOT_STRINGS[lang])) {
      expect(value.trim(), `${lang}:${key} empty`).not.toBe('');
      expect(value, `${lang}:${key} broken: "${value}"`).not.toMatch(BROKEN);
    }
  });

  it('slotLexFor falls back to English for unknown languages', () => {
    expect(slotLexFor('ko')).toBe(SLOT_STRINGS.en);
    expect(slotLexFor(null)).toBe(SLOT_STRINGS.en);
    expect(slotLexFor('de-AT')).toBe(SLOT_STRINGS.de);
  });

  it('keeps the English strings byte-identical to the legacy hardcoded copy', () => {
    const L = SLOT_STRINGS.en;
    expect(L.statusLiveSince('2 hours')).toBe('Live since 2 hours');
    expect(L.statusEndsIn('~2h')).toBe('Ends in ~2h');
    expect(L.statusAround('10pm your time · 12am CEST')).toBe(
      'Around 10pm your time · 12am CEST',
    );
    expect(L.statusYourTime('10pm')).toBe('10pm your time');
    expect(L.statusWasExpected('10pm')).toBe('Was expected around 10pm');
    expect(L.statusOffline).toBe('Offline');
    expect(L.confidencePrefix).toBe('Confidence:');
    expect(L.confidenceLabels).toEqual({ high: 'HIGH', medium: 'MEDIUM', low: 'LOW' });
    expect(L.confidenceAria('high')).toBe('high confidence');
    expect(L.liveBadgeAria).toBe('Currently live');
    expect(L.nStreams(1)).toBe('1 stream');
    expect(L.nStreams(3)).toBe('3 streams');
    expect(L.jumpToDayAria).toBe('Jump to a day');
    expect(L.streamsOnAria('Today')).toBe('Streams on Today');
    expect(L.noStreamsExpected).toBe('No streams expected');
    expect(L.favoriteAria(NAME)).toBe(`Favorite ${NAME}`);
    expect(L.favoriteAria(undefined)).toBe('Favorite streamer');
    expect(L.signInToFavoriteAria(undefined)).toBe('Sign in to favorite this streamer');
    expect(L.saveInAppAria(undefined)).toBe('Save streamer in the app');
    expect(L.signInTitle).toBe('Sign in to save favorites');
    expect(L.saveInAppTitle).toBe('Save in the app');
    expect(L.addToFavorites).toBe('Add to favorites');
    expect(L.removeFromFavorites).toBe('Remove from favorites');
    expect(L.watchOnTwitch).toBe('Watch on Twitch');
    expect(L.watchOnYouTube).toBe('Watch on YouTube');
    expect(L.opensInNewTab).toBe(' (opens in new tab)');
    // M22 S4.1 — byte-identical to GameCard's former inline strings.
    expect(L.gameLiveBadge(3)).toBe('3 live');
    expect(L.gameStreamerCount(1)).toBe('1 streamer');
    expect(L.gameStreamerCount(12)).toBe('12 streamers');
    expect(L.gameHoursShort('1.2K')).toBe('1.2Kh / 28d');
    expect(L.gameWatchingNow('16.3K')).toBe('16.3K watching now');
    expect(L.gameTrendTitle).toBe('Week-over-week change in active streamers');
  });

  it('applies Slavic plural rules to stream counts', () => {
    expect(SLOT_STRINGS.ru.nStreams(1)).toBe('1 стрим');
    expect(SLOT_STRINGS.ru.nStreams(2)).toBe('2 стрима');
    expect(SLOT_STRINGS.ru.nStreams(5)).toBe('5 стримов');
    expect(SLOT_STRINGS.ru.nStreams(21)).toBe('21 стрим');
    expect(SLOT_STRINGS.pl.nStreams(1)).toBe('1 stream');
    expect(SLOT_STRINGS.pl.nStreams(2)).toBe('2 streamy');
    expect(SLOT_STRINGS.pl.nStreams(5)).toBe('5 streamów');
    expect(SLOT_STRINGS.pl.nStreams(21)).toBe('21 streamów');
  });
});
