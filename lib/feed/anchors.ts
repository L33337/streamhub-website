// Anchor ids + scroll offset for the feed's sticky section nav (2026-08-03).
//
// Shared by three parties that must agree: FeedClient (renders most sections),
// app/[locale]/feed/page.tsx (renders the Streamer Wiki as a sibling AND builds
// the chip list), and the section components themselves. A chip whose id has no
// element is pruned by HomeSectionNav at mount, so a drift here degrades to a
// missing chip rather than a dead jump — but it is still a bug.

export const FEED_ANCHORS = {
  live: 'feed-live',
  upNext: 'feed-upnext',
  recent: 'feed-recent',
  clips: 'feed-clips',
  rankings: 'feed-rankings',
  stats: 'feed-stats',
  wiki: 'feed-wiki',
} as const;

/**
 * Scroll offset for anchor jumps. Up to three stacked sticky bars can sit
 * above a section: the site header, the section nav (61px) and the category
 * chip row (~60px). 8.5rem clears all three; where fewer are present the extra
 * air is harmless.
 *
 * Must be a literal — Tailwind only generates classes it can read as complete
 * strings in the source, so this can never be composed from a number.
 */
export const FEED_SECTION_ANCHOR_CLASS = 'scroll-mt-[calc(var(--header-height)+8.5rem)]';
