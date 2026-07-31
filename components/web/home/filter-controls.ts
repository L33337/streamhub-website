/**
 * Chrome shared by the homepage's two filter islands (HomeLiveRailFilters,
 * HomeUpNextFilters). They were kept in sync by hand and by comment, which
 * already cost one regression: the 2026-07-30 mobile round raised the live
 * rail's controls to a 44px touch target while the lineup's chips were being
 * replaced by selects on another branch, and the rule silently didn't reach
 * them. One constant, one place to change.
 */

/**
 * `min-h-11`: these are the primary filter affordance on a phone and were
 * 32px tall, well under the 44px touch minimum.
 *
 * `max-w-*` + `truncate`: a native select sizes itself to its WIDEST option, so
 * a single long game name ("Delta Rune chapter three or welcome to the Game
 * three (1)") stretched the closed category pill across the entire phone
 * screen, with its label floating far from the chevron. The cap keeps the
 * live rail's two pills on one row on the narrowest phone (176 + 8 + ~131 <
 * 342) and only ever elides inside the CLOSED control — the dropdown list
 * renders natively at full length. The `sm:` cap sits above the widest real
 * option, so nothing truncates once there is room.
 */
export const FILTER_SELECT_CLASS =
  'min-h-11 max-w-44 truncate rounded-full border border-border-default bg-background-elevated px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-accent-cyan/50 hover:text-white focus-visible:border-accent-cyan focus-visible:outline-none sm:max-w-60';
