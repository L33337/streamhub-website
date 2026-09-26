// Counts the game hub prints in prose (game-hub UX round 2026-09-24).
//
// The hub's schedule comes from ONE capped API call (limit 200 upcoming,
// 100 live). When the cap is hit the API says `has_more`, and the honest way
// to print that number is "200+", never a bare "200" that reads like an exact
// total. Every lexicon entry that interpolates such a number takes a `Count`
// so the "+" can never be forgotten at one call site and remembered at
// another. Plural agreement uses `n` (a "200+" is plural in every language).

export interface Count {
  /** The number actually counted in this render. */
  n: number;
  /** True when the underlying fetch was capped, so the real total is higher. */
  more: boolean;
}

/** "200+" when capped, "200" otherwise. Digits stay unformatted (all < 10,000). */
export function plusCount(c: Count): string {
  return `${c.n}${c.more ? '+' : ''}`;
}

/** Grammatical singular only for an exact 1 ("1+" is already plural). */
export function isExactlyOne(c: Count): boolean {
  return c.n === 1 && !c.more;
}
