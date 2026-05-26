'use client';

import { useEffect, useState } from 'react';
import { DOC_SECTIONS } from '../sections';

/**
 * Sticky TOC for the developer portal. Highlights the section currently in
 * view using IntersectionObserver. Hidden on mobile — mobile users navigate
 * via the `MobileSectionJump` dropdown.
 */
export function SidebarNav() {
  const [active, setActive] = useState<string>(DOC_SECTIONS[0].id);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Use the most-intersecting entry to avoid flicker when sections overlap.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    for (const s of DOC_SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Developer portal sections"
      className="hidden lg:block sticky top-24 self-start text-sm"
    >
      <p className="mb-3 font-mono uppercase text-xs tracking-wider text-text-muted">
        On this page
      </p>
      <ul className="space-y-1 border-l border-border-default">
        {DOC_SECTIONS.map((s) => {
          const isActive = s.id === active;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={[
                  '-ml-px block border-l-2 pl-4 py-1 transition-colors',
                  isActive
                    ? 'border-accent-cyan text-accent-cyan'
                    : 'border-transparent text-text-secondary hover:text-text-primary',
                ].join(' ')}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
