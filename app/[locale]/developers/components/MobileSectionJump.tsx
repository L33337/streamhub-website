'use client';

import { useCallback } from 'react';
import { DOC_SECTIONS } from '../sections';

/**
 * Mobile-only section-jump dropdown. Replaces the desktop SidebarNav.
 * Uses an anchor-based navigation via `location.hash` so deep links still work.
 */
export function MobileSectionJump() {
  const onChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    }
  }, []);

  return (
    <div className="lg:hidden mb-6">
      <label
        htmlFor="section-jump"
        className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-2"
      >
        Jump to section
      </label>
      <select
        id="section-jump"
        onChange={onChange}
        defaultValue=""
        className="w-full rounded-lg border border-border-default bg-background-elevated px-3 py-2 text-text-primary"
      >
        <option value="" disabled>
          Select…
        </option>
        {DOC_SECTIONS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
