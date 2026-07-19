// Video-game vs non-game category classification (games-page expansion WP7).
//
// Used to decide whether /game/[slug] may emit VideoGame JSON-LD: Twitch
// categories like "Just Chatting" are NOT video games, and labeling them as
// such in structured data would be wrong (risking rich-result penalties).
// Box-art presence is NOT a game signal — Just Chatting has box art too —
// hence an explicit denylist of Twitch's non-game categories.
//
// The list is maintenance-light: Twitch adds non-game categories rarely, and
// a miss only means one page emits VideoGame markup for a fringe non-game
// category (low blast radius). Matching is case-insensitive.

const NON_GAME_CATEGORIES = new Set(
  [
    'Just Chatting',
    'IRL',
    'Music',
    'Art',
    'ASMR',
    'Talk Shows & Podcasts',
    'Special Events',
    'Sports',
    'Travel & Outdoors',
    'Pools, Hot Tubs, and Beaches',
    'Crypto',
    'Software and Game Development',
    'Science & Technology',
    'Food & Drink',
    'Fitness & Health',
    'Politics',
    'Animals, Aquariums, and Zoos',
    'DJs',
    'Co-working & Studying',
    'Makers & Crafting',
    'Beauty & Body Art',
    'Watch Parties',
    'Games + Demos',
    'Retro',
    'Always On',
    'I’m Only Sleeping',
    'Slots',
    'Virtual Casino',
    'Twitch Plays',
  ].map((c) => c.toLowerCase())
);

/** True when the category is (as far as we can tell) an actual video game. */
export function isVideoGameCategory(category: string): boolean {
  return !NON_GAME_CATEGORIES.has(category.trim().toLowerCase());
}
