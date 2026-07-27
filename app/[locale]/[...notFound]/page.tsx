import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// Catch-all for unmatched URLs. Next.js only renders a custom 404 for
// unmatched routes from a ROOT app/not-found.tsx — but this app's root layout
// lives inside the dynamic [locale] segment (app/layout.tsx cannot exist
// without restructuring <html lang> handling, and global-not-found.js is
// still experimental in Next 16). Before this catch-all existed, every
// unknown URL rendered the unbranded framework 404. Now: middleware rewrites
// unknown unprefixed paths into the /en tree, this route claims whatever no
// real route matched, and notFound() renders app/[locale]/not-found.tsx
// inside the localized site chrome with a real 404 status. Registered routes
// always beat a catch-all, so it can never shadow a real page.
//
// Deliberately NO generateStaticParams (deviation from the "every dynamic
// route exports it" ISR rule): the params space is unbounded junk URLs, and
// caching a page per bot-scanned path would only pollute the ISR cache. The
// render is a synchronous throw — per-request cost is negligible.
//
// Residual gap, accepted: paths containing a dot (/wp-login.php) pass through
// the middleware without a locale rewrite and keep the framework 404 (status
// is correct, just unbranded) — a root-level catch-all can't exist here for
// the same root-layout reason.

export const metadata: Metadata = {
  title: 'Page not found — StreamerTimes',
  robots: { index: false, follow: false },
};

export default function UnmatchedRoute(): never {
  notFound();
}
