'use client';

// Shared client hook for horizontally scrollable data containers (M24 tables
// + heatmap): tracks whether the container is scrolled away from either edge
// so components can render edge-fade overlays as a scroll affordance. Without
// it, phone users get no signal that columns/hours continue off-screen.
//
// SSR/hydration-safe: the initial state renders NO fades; the effect measures
// after hydration, so overlays appear client-side without a markup mismatch.

import { useCallback, useEffect, useRef, useState } from 'react';

const EDGE_TOLERANCE_PX = 4;

export function useHScrollFade<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  fade: { left: boolean; right: boolean };
} {
  const ref = useRef<T | null>(null);
  const [fade, setFade] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > EDGE_TOLERANCE_PX;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_TOLERANCE_PX;
    setFade((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    // Viewport rotation / container resize moves the edges too.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [update]);

  return { ref, fade };
}
