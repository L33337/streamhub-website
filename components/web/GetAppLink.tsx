'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  detectGetAppTarget,
  FALLBACK_URL,
  type GetAppTarget,
} from '@/lib/get-app-target';

/**
 * Renders an anchor that points to the App Store on iOS, Google Play on
 * Android, and the /app landing page everywhere else. Mirrors the routing
 * logic of FloatingGetAppButton so inline "get the app" hyperlinks behave
 * identically to the floating CTA.
 *
 * SSR fallback: renders the /app Link so the markup is present and crawlable;
 * after hydration the href swaps to the store URL on mobile devices.
 */
export function GetAppLink({
  children,
  className,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const [target, setTarget] = useState<GetAppTarget>({
    href: FALLBACK_URL,
    external: false,
  });

  useEffect(() => {
    setTarget(detectGetAppTarget());
  }, []);

  if (target.external) {
    return (
      <a
        {...rest}
        href={target.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link {...rest} href={target.href} className={className}>
      {children}
    </Link>
  );
}
