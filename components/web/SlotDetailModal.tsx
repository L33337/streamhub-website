'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function SlotDetailModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  // The intercepted route renders this modal while the URL is /schedule/<id>.
  // If the user navigates away (e.g. clicking the streamer name link) before
  // Next.js has a chance to unmount the @modal parallel slot, hide the overlay
  // ourselves based on pathname so the new page is visible immediately.
  const isOpen = pathname.startsWith('/schedule/');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.back();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    containerRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [router, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-2 py-4 backdrop-blur-sm sm:px-4 sm:py-8"
      onClick={() => router.back()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-detail-title"
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="gradient-border relative my-auto w-full max-w-2xl bg-background-elevated outline-none focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close detail view"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-accent-cyan bg-accent-cyan/15 text-accent-cyan backdrop-blur transition-colors glow-cyan hover:bg-accent-cyan hover:text-background"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </button>
        {children}
      </div>
    </div>
  );
}
