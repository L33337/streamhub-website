/**
 * True when a className string already establishes a positioning context.
 *
 * Why this is needed: several small controls (favourite heart, lineup bell) grow
 * their touch target with an absolutely-positioned `::before`, which needs the
 * control itself to be positioned. Adding a blanket `relative` breaks callers
 * that position the control themselves — Tailwind emits every `position`
 * utility in one layer, so `relative` and `absolute` have equal specificity and
 * the winner is decided by stylesheet order, not by the order in the class
 * attribute. `relative` won, and overlay hearts/bells silently dropped out of
 * their corners and stacked up in the page flow.
 *
 * So: only supply `relative` when the caller has not already positioned it.
 */
export function hasPositionClass(className: string): boolean {
  return /(^|\s)(absolute|fixed|sticky|relative)(\s|$)/.test(className);
}

/**
 * Per-side growth of the invisible ::before hit area, as full literal class
 * strings — Tailwind scans source text, so these can never be assembled from
 * template parts.
 */
const EXPANDER = {
  /** +4px per side: 36px control → 44px target. */
  sm: "before:absolute before:-inset-1 before:content-['']",
  /** +6px per side: 32px control → 44px target. */
  md: "before:absolute before:-inset-1.5 before:content-['']",
  /** +8px per side: 28px control → 44px target. */
  lg: "before:absolute before:-inset-2 before:content-['']",
} as const;

/**
 * Classes that grow a control's touch target beyond its visual box, for the
 * 24–32px icon buttons that sit on top of cards where a real 44px box would
 * crowd the design.
 */
export function touchTargetExpander(
  className: string,
  size: keyof typeof EXPANDER,
): string {
  return `${hasPositionClass(className) ? '' : 'relative '}${EXPANDER[size]}`;
}
