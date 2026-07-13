import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPartnerApi,
  PartnerApiError,
  type PublicStreamer,
} from '@/lib/server/partner-api';
import { getLiveStreamerIdSet } from '@/lib/server/live-streamers';
import {
  SearchResultCard,
  type SearchResultStreamer,
} from '@/components/web/SearchResultCard';
import { buildBreadcrumbJsonLd } from '@/lib/seo';

const SITE_URL = 'https://streamertimes.tv';

/**
 * Streamers rendered per page. 60 = 30 rows x 2 columns. Keeps the DOM at ~60
 * cards instead of the whole roster: the un-paginated index shipped 5.2 MB /
 * ~3,000 DOM nodes at 225 streamers (PSI mobile LCP 5.5 s), ~27 MB at the 2,000
 * cap. Paginating is the fix (M20 S1.5).
 */
export const PAGE_SIZE = 60;
const FETCH_LIMIT = 500;
const MAX_FETCH_PAGES = 4; // safety cap = 2,000 streamers fetched (mirrors app/sitemap.ts)

/** First-letter bucket key for a name: 'A'–'Z' or '#' for digits/symbols. */
function bucketKey(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

// Bucket order: A–Z then '#'.
const LETTERS: string[] = [
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
  '#',
];
const letterAnchor = (l: string) => `letter-${l === '#' ? 'hash' : l}`;

/** Relative href for a page number — page 1 lives at /streamers, not /page/1. */
function pageHref(page: number): string {
  return page <= 1 ? '/streamers' : `/streamers/page/${page}`;
}

/** Absolute canonical URL for a page number (used by both routes' metadata). */
export function pageCanonical(page: number): string {
  return `${SITE_URL}${pageHref(page)}`;
}

interface IndexData {
  entries: SearchResultStreamer[];
  failed: boolean;
}

/**
 * Cached per request: the page-1 render, a page-N render and generateMetadata
 * all dedupe to a single roster fetch. The partner API is cursor-only (no
 * offset), so a specific page can't be fetched directly — we page the whole
 * (alphabetical) roster once and slice in memory. The fetch is small and data-
 * cached (revalidate 300); the win is the rendered HTML, not the fetch. Cursor
 * loop mirrors app/sitemap.ts.
 */
export const loadStreamersIndex = cache(async (): Promise<IndexData> => {
  const api = getPartnerApi();
  try {
    // Live-set lookup runs alongside the (sequential) cursor loop.
    const livePromise = getLiveStreamerIdSet().catch(() => new Set<string>());
    const all: PublicStreamer[] = [];
    let cursor: string | undefined = undefined;
    let pages = 0;
    do {
      const resp = await api.listStreamers({
        order: 'name',
        limit: FETCH_LIMIT,
        cursor,
        revalidate: 300,
      });
      all.push(...resp.data);
      cursor = resp.pagination.next_cursor ?? undefined;
      pages++;
    } while (cursor && pages < MAX_FETCH_PAGES);
    const liveSet = await livePromise;
    return {
      entries: all.map((s) => ({ ...s, is_live: liveSet.has(s.id) })),
      failed: false,
    };
  } catch (err) {
    if (!(err instanceof PartnerApiError)) throw err;
    return { entries: [], failed: true };
  }
});

/** Total pages for a roster size (>= 1 so page 1 always exists). */
export function totalStreamerPages(count: number): number {
  return Math.max(1, Math.ceil(count / PAGE_SIZE));
}

/**
 * Windowed page-number list for the numeric nav: 1, the current page's
 * neighbours, and the last page, with `null` marking an ellipsis gap.
 */
function pageWindow(current: number, total: number): (number | null)[] {
  const wanted = [1, total, current - 1, current, current + 1]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b)
    .filter((n, i, arr) => arr.indexOf(n) === i);
  const seq: (number | null)[] = [];
  let prev = 0;
  for (const n of wanted) {
    if (prev && n - prev > 1) seq.push(null);
    seq.push(n);
    prev = n;
  }
  return seq;
}

const NAV_LINK =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-border-default bg-background-elevated px-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent-cyan/60 hover:bg-background-highlight hover:text-accent-cyan';
const NAV_CURRENT =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-accent-cyan/60 bg-background-highlight px-3 text-sm font-semibold text-accent-cyan';
const NAV_DISABLED =
  'inline-flex h-9 min-w-9 cursor-default items-center justify-center rounded-md border border-border-default/50 px-3 text-sm font-semibold text-text-muted';

/**
 * Server-rendered, paginated A–Z streamer index. Shared by /streamers (page 1)
 * and /streamers/page/[n]. NO Suspense / no loading.tsx on the route: the
 * component is awaited directly so notFound() 404s honestly and every link is
 * server-rendered (the soft-404 rule from app/streamer/[slug]/page.tsx).
 */
export async function StreamersIndexView({ page }: { page: number }) {
  const { entries, failed } = await loadStreamersIndex();
  const total = totalStreamerPages(entries.length);

  // Out-of-range page N → 404 (but never on API failure: page 1 shows the error
  // card instead, and page 1 always renders its shell even for an empty roster).
  if (!failed && (page < 1 || page > total)) notFound();

  const start = (page - 1) * PAGE_SIZE;
  const slice = entries.slice(start, start + PAGE_SIZE);

  // For the A–Z jump bar: the page each letter first appears on, so a letter
  // link jumps straight to the right page + anchor across the whole roster.
  const letterPage = new Map<string, number>();
  entries.forEach((s, i) => {
    const k = bucketKey(s.name);
    if (!letterPage.has(k)) letterPage.set(k, Math.floor(i / PAGE_SIZE) + 1);
  });
  const activeLetters = LETTERS.filter((l) => letterPage.has(l));

  // Group only this page's slice into contiguous letter sections.
  const sections: { letter: string; items: SearchResultStreamer[] }[] = [];
  for (const s of slice) {
    const k = bucketKey(s.name);
    const last = sections[sections.length - 1];
    if (last && last.letter === k) last.items.push(s);
    else sections.push({ letter: k, items: [s] });
  }

  const breadcrumb = buildBreadcrumbJsonLd(
    page > 1
      ? [
          { name: 'Home', url: SITE_URL },
          { name: 'Streamers', url: `${SITE_URL}/streamers` },
          { name: `Page ${page}` },
        ]
      : [{ name: 'Home', url: SITE_URL }, { name: 'Streamers' }],
  );

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <h1 className="text-3xl font-bold text-white">
        All Twitch &amp; YouTube streamers A–Z
      </h1>
      <p className="mt-3 max-w-2xl text-text-secondary">
        Every streamer tracked on Streamer Times — see who is live now and what
        they stream next. Jump to a letter or browse page by page.
        {total > 1 && (
          <>
            {' '}
            <span className="text-text-muted">
              Page {page} of {total}.
            </span>
          </>
        )}
      </p>

      {failed || entries.length === 0 ? (
        <div className="mt-8 gradient-border p-8 text-center">
          <p className="text-accent-pink">
            Streamers are temporarily unavailable. Please try again in a moment.
          </p>
        </div>
      ) : (
        <>
          {/* Sticky A–Z jump bar — each letter links to the page holding it. */}
          <nav
            aria-label="Jump to a letter"
            className="sticky top-[var(--header-height)] z-10 -mx-4 mt-6 mb-2 border-b border-divider bg-background/95 px-4 py-3 backdrop-blur"
          >
            <ul className="flex flex-wrap gap-1.5" role="list">
              {activeLetters.map((letter) => {
                const lp = letterPage.get(letter)!;
                const here = lp === page;
                return (
                  <li key={letter}>
                    <Link
                      href={`${pageHref(lp)}#${letterAnchor(letter)}`}
                      aria-current={here ? 'true' : undefined}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold transition-colors ${
                        here
                          ? 'border-accent-cyan/60 bg-background-highlight text-accent-cyan'
                          : 'border-border-default bg-background-elevated text-text-primary hover:border-accent-cyan/60 hover:bg-background-highlight hover:text-accent-cyan'
                      }`}
                    >
                      {letter}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {sections.map(({ letter, items }) => (
            <section
              key={letter}
              id={letterAnchor(letter)}
              aria-labelledby={`heading-${letter === '#' ? 'hash' : letter}`}
              className="mt-8 scroll-mt-28"
            >
              <h2
                id={`heading-${letter === '#' ? 'hash' : letter}`}
                className="text-xl font-bold text-accent-cyan"
              >
                {letter}
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {items.map((s) => (
                  <li key={s.id}>
                    <SearchResultCard streamer={s} compact />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {total > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-10 flex flex-wrap items-center justify-center gap-2"
            >
              {page > 1 ? (
                <Link href={pageHref(page - 1)} rel="prev" className={NAV_LINK}>
                  ← Previous
                </Link>
              ) : (
                <span className={NAV_DISABLED}>← Previous</span>
              )}
              {pageWindow(page, total).map((n, i) =>
                n === null ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-text-muted">
                    …
                  </span>
                ) : n === page ? (
                  <span key={n} aria-current="page" className={NAV_CURRENT}>
                    {n}
                  </span>
                ) : (
                  <Link key={n} href={pageHref(n)} className={NAV_LINK}>
                    {n}
                  </Link>
                ),
              )}
              {page < total ? (
                <Link href={pageHref(page + 1)} rel="next" className={NAV_LINK}>
                  Next →
                </Link>
              ) : (
                <span className={NAV_DISABLED}>Next →</span>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
