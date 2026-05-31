'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { detectGetAppTarget, type GetAppTarget } from '@/lib/get-app-target';

export function FloatingGetAppButton() {
  const pathname = usePathname();
  const [target, setTarget] = useState<GetAppTarget | null>(null);

  useEffect(() => {
    setTarget(detectGetAppTarget());
  }, []);

  if (pathname?.startsWith('/auth')) {
    return null;
  }

  if (!target) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-40 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <a
        href={target.href}
        {...(target.external
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
        aria-label="Get the Streamer Times App"
        className="inline-flex items-center gap-2 rounded-full border border-border-default bg-background-elevated px-4 py-3 text-sm font-semibold text-text-primary shadow-lg transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight active:scale-95"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 fill-current text-accent-cyan"
          aria-hidden="true"
        >
          <path d="M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V4a1 1 0 0 1 1-1Zm-7 15a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
        </svg>
        Get the App
      </a>
    </div>
  );
}
