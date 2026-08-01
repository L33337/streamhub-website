/**
 * SVG sprite for the icons that repeat PER CARD (2026-08-01 payload round).
 *
 * Card icons are the only ones that scale with the data: the homepage shipped
 * 174 copies of the eye glyph and 165 of the heart, ~390 bytes and four DOM
 * nodes each, for 122 KB of markup that says the same thing over and over.
 * Everything else on a page is chrome — a handful of instances — and stays a
 * plain `lucide-react` import, where tree-shaking and readability win.
 *
 * `IconSpriteDefs` is mounted once per document in the root layout; `Icon`
 * renders a two-node reference to it. Presentation attributes live on the
 * OUTER `<svg>` (stroke, fill, width) and inherit into the referenced symbol,
 * which is why one `heart` symbol serves both the outlined and the filled
 * variant.
 *
 * Adding a glyph here is only worth it when a page can render it dozens of
 * times; below that the sprite's own bytes cost more than the repetition.
 */

/** Symbol ids are namespaced so nothing on the page can collide with them. */
const ID_PREFIX = 'sti-';

export type SpriteIconName = 'heart' | 'eye' | 'bell' | 'play' | 'calendar-clock';

/**
 * The glyph bodies, all on lucide's 24×24 grid (the heart is our own
 * hand-rolled path from the former `FavoriteButton.HeartIcon`, on the same
 * grid). Paths carry NO presentation attributes — they inherit them from the
 * referencing `<svg>`, which is what makes filled/outlined a caller decision.
 */
const GLYPHS: Record<SpriteIconName, React.ReactNode> = {
  heart: (
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  ),
  eye: (
    <>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  bell: (
    <>
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </>
  ),
  play: (
    <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
  ),
  'calendar-clock': (
    <>
      <path d="M16 14v2.2l1.6 1" />
      <path d="M16 2v4" />
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
      <path d="M3 10h5" />
      <path d="M8 2v4" />
      <circle cx="16" cy="16" r="6" />
    </>
  ),
};

/**
 * The symbol definitions. Rendered once per document, directly inside
 * `<body>`, and inert: it paints nothing and takes no space.
 *
 * Sized to zero via inline style rather than `display:none` — a `display:none`
 * sprite is the one variant with a history of breaking `<use>` references, and
 * an inline style needs no stylesheet to have loaded before it applies.
 */
export function IconSpriteDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        {(Object.keys(GLYPHS) as SpriteIconName[]).map((name) => (
          <symbol key={name} id={`${ID_PREFIX}${name}`} viewBox="0 0 24 24">
            {GLYPHS[name]}
          </symbol>
        ))}
      </defs>
    </svg>
  );
}

/**
 * A sprite reference. Defaults reproduce lucide's stroke styling exactly, so a
 * swapped icon is byte-for-byte the same picture.
 *
 * `filled` switches to a solid glyph (the favourite heart's two states) —
 * fill and stroke both live on this element, so the shared symbol needs no
 * variant of its own.
 */
export function Icon({
  name,
  size = 16,
  filled = false,
  className,
  ...rest
}: {
  name: SpriteIconName;
  size?: number;
  filled?: boolean;
  className?: string;
} & Omit<React.SVGProps<SVGSVGElement>, 'name' | 'ref'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <use href={`#${ID_PREFIX}${name}`} />
    </svg>
  );
}
