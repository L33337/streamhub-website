import Link from 'next/link';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/get-app-target';

/**
 * Global site footer. Rendered on every page from the root layout so that the
 * key internal destinations — the full streamer index, the developer/API page,
 * and the legal pages — are reachable via a crawlable HTML link from anywhere.
 *
 * Before this existed those pages were only linked from the homepage (or the
 * XML sitemap alone), leaving most of the site at excessive crawl depth. A
 * footer present on every page distributes internal link equity site-wide and
 * surfaces the legal/support links search engines expect for E-E-A-T.
 *
 * Server component — purely static links, no client state.
 */

interface FooterLink {
  href: string;
  label: string;
}

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Discover',
    links: [
      { href: '/live', label: 'Live now' },
      { href: '/streamers', label: 'All streamers' },
      { href: '/games', label: 'All games' },
      { href: '/rankings', label: 'Streamer rankings' },
      { href: '/', label: 'Popular streamers' },
      { href: '/app', label: 'Get the app' },
    ],
  },
  {
    heading: 'Developers',
    links: [{ href: '/developers', label: 'Public API' }],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/support', label: 'Support' },
      { href: '/privacy-policy', label: 'Privacy Policy' },
      { href: '/terms-of-service', label: 'Terms of Service' },
      { href: '/impressum', label: 'Impressum' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-divider bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand + store badges */}
          <div className="col-span-2 sm:col-span-1">
            <Link
              href="/"
              className="text-lg font-bold text-white"
              aria-label="Streamer Times home"
            >
              StreamerTimes
            </Link>
            <p className="mt-2 max-w-xs text-sm text-text-secondary">
              Your Livestream Guide for Twitch &amp; YouTube.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-background-elevated px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:border-accent-cyan/40"
                aria-label="Download on the App Store"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                App Store
              </a>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-background-elevated px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:border-accent-cyan/40"
                aria-label="Get it on Google Play"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                  <path d="M3.61 1.814 13.793 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734c0-.384.22-.72.61-.92zM14.5 12.707l2.55 2.55-8.37 4.78L14.5 12.707zM19.41 11.1l-2.2 1.26L14.5 12l2.71-.36 2.2-1.26c.5-.28.5-.72 0-1L17.21 8.12 14.5 12l2.71.36 2.2 1.26c.22.12.22.26 0 .38zM8.68 3.963l8.37 4.78L14.5 11.293 8.68 3.963z" />
                </svg>
                Google Play
              </a>
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
                {col.heading}
              </h2>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary transition-colors hover:text-accent-cyan"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-divider pt-6 text-xs text-text-muted">
          © {new Date().getFullYear()} Streamer Times — Your Livestream Guide.
        </div>
      </div>
    </footer>
  );
}
