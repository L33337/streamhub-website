/**
 * Chrome shared by the homepage's filter islands (HomeLiveRailFilters,
 * HomeUpNextFilters, HomeTrendingRailClient). They were kept in sync by hand
 * and by comment, which
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

/**
 * Segmented sort control (trending rail, 2026-07-31). Same two-state colours
 * as the game-ranking explorer so the site has one "pick a metric" language,
 * with three deliberate homepage deviations:
 *
 * - **The GROUP is 44px tall, not each button** (36px button + 3px padding +
 *   1px border per side), so it lines up with the `FILTER_SELECT_CLASS` pills
 *   of the live rail and the lineup. 44px buttons made the bordered group 54px,
 *   which towered over them. The touch minimum is still met: an invisible
 *   `::before` grows the hit area back to 44px vertically — the same trick as
 *   `touchTargetExpander` (lib/ui/positioning.ts), but inset on the Y axis
 *   ONLY, because a symmetric `-inset-1` would have neighbouring segments
 *   overlap each other's hit area and the later sibling would steal the edge
 *   of the earlier one.
 * - **Exactly one row, always** (`flex-nowrap` + `shrink-0`): a wrapping group
 *   pushed the rail down and read as two unrelated controls on a phone. The
 *   labels are kept short per locale so all four fit a 390px screen, but a
 *   long translation or a 320px device must scroll, not wrap — hence the
 *   scroller rather than `overflow-hidden`, which would cut an option off with
 *   no way to reach it.
 * - Tighter type and padding below `sm`, where the budget is ~334px for four
 *   buttons; from `sm` up they relax to the ranking explorer's sizing.
 *
 * The scroller is a SEPARATE element from the bordered group on purpose.
 * `overflow-x: auto` computes `overflow-y` to `auto` as well, and a scroll
 * container clips at its padding box — putting the overflow on the group
 * itself sheared the buttons' `::before` down to a 42px hit area. The
 * scroller's own `py-1.5` gives that overflow room to live in — 6px against
 * the `::before`'s 4px+ of growth, so the hit area never sits flush against
 * the clip edge — and `-my-1.5` cancels the padding again so the control
 * still occupies exactly its 44px.
 */
export const FILTER_SEGMENT_SCROLLER_CLASS =
  '-my-1.5 overflow-x-auto py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

export const FILTER_SEGMENT_GROUP_CLASS =
  'flex w-fit flex-nowrap gap-0.5 rounded-lg border border-border-default p-[3px] sm:gap-1';

export const FILTER_SEGMENT_BUTTON_CLASS =
  "relative min-h-9 shrink-0 whitespace-nowrap rounded-md px-2 text-[11px] font-semibold transition-colors before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] sm:px-3 sm:text-xs";

export const FILTER_SEGMENT_BUTTON_ACTIVE_CLASS = 'bg-accent-cyan/20 text-accent-cyan';

export const FILTER_SEGMENT_BUTTON_IDLE_CLASS =
  'text-text-secondary hover:text-text-primary';
