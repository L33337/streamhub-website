// Single source of truth for legal-page "Last updated" dates.
// Bump the ISO date here whenever a legal page's content changes — both the
// visible "Last updated" line AND the sitemap <lastmod> read from this, so the
// two can never drift apart.
export const LEGAL_LAST_UPDATED = {
  'privacy-policy': '2026-08-17',
  'terms-of-service': '2026-02-21',
  impressum: '2026-04-05',
} as const;

// Same contract for the evergreen methodology pages (2026-08-27): the page's
// visible "Last updated" line and its sitemap <lastmod> both read from here.
export const CONTENT_LAST_UPDATED = {
  'methodology-predictions': '2026-08-27',
} as const;

/** "2026-02-21" -> "February 21, 2026" (UTC-stable, matches existing on-page wording). */
export function formatLegalDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
