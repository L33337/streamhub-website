'use client';

import { useId, useState } from 'react';

interface Props {
  /** Bio paragraphs, already split on the \n\n breaks the prompt enforces. */
  paragraphs: string[];
  /** Set only when the bio's language differs from the page's UI language. */
  lang?: string;
  dir?: 'rtl';
  moreLabel: string;
  lessLabel: string;
}

/**
 * Streamer bio with a clamp that only exists below `md`.
 *
 * The full text is always in the DOM — the collapse is purely visual, so no
 * crawlable copy and nothing a screen reader needs sits behind the button.
 * The point is the mobile fold: the multi-paragraph AI bio used to push the
 * schedule (what a "when does X stream" searcher actually came for) about two
 * screens down. Desktop has the room, so it never clamps.
 *
 * Short single-paragraph bios render untouched — a toggle for two lines of
 * text is worse than no toggle.
 */
export function CollapsibleBio({ paragraphs, lang, dir, moreLabel, lessLabel }: Props) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();

  // Cheap, deterministic length heuristic instead of measuring: a measured
  // clamp would need a layout effect and would shift the page after paint.
  const clampable = paragraphs.length > 1 || (paragraphs[0]?.length ?? 0) > 180;

  return (
    <div>
      <div
        id={id}
        lang={lang}
        dir={dir}
        className="space-y-3 text-sm leading-relaxed text-text-secondary"
      >
        {paragraphs.map((para, i) => {
          // First paragraph clamps to 3 lines; the rest collapse entirely.
          // Both revert at md, whatever the toggle says.
          const collapsedClass =
            clampable && !expanded
              ? i === 0
                ? 'line-clamp-3 md:line-clamp-none'
                : 'hidden md:block'
              : '';
          return (
            <p key={i} className={collapsedClass}>
              {para}
            </p>
          );
        })}
      </div>
      {clampable && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={id}
          className="mt-2 text-xs font-semibold text-accent-cyan transition-colors hover:text-accent-cyan/80 md:hidden"
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
}
