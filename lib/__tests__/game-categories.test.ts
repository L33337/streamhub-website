import { describe, expect, it } from 'vitest';
import { isVideoGameCategory } from '../game-categories';

describe('isVideoGameCategory', () => {
  it('real games are games', () => {
    expect(isVideoGameCategory('Fortnite')).toBe(true);
    expect(isVideoGameCategory('League of Legends')).toBe(true);
    expect(isVideoGameCategory('Grand Theft Auto V')).toBe(true);
  });

  it('Twitch non-game categories are not games', () => {
    expect(isVideoGameCategory('Just Chatting')).toBe(false);
    expect(isVideoGameCategory('IRL')).toBe(false);
    expect(isVideoGameCategory('Music')).toBe(false);
    expect(isVideoGameCategory('Talk Shows & Podcasts')).toBe(false);
    expect(isVideoGameCategory('Pools, Hot Tubs, and Beaches')).toBe(false);
    expect(isVideoGameCategory('Software and Game Development')).toBe(false);
  });

  it('matching is case- and whitespace-insensitive', () => {
    expect(isVideoGameCategory('just chatting')).toBe(false);
    expect(isVideoGameCategory('  JUST CHATTING  ')).toBe(false);
  });
});
