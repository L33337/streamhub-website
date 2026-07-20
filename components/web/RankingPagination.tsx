import Link from 'next/link';

interface Props {
  /** Current 1-based page. */
  page: number;
  /** Total pages (>= 1). */
  pages: number;
  /**
   * Href builder for a page. Page 1 must return the canonical un-suffixed URL
   * so the first page never has two addresses.
   */
  hrefFor: (page: number) => string;
  /** Accessible name of the nav landmark. */
  label: string;
}

/**
 * Numbered pagination for the ranking leaderboards.
 *
 * Deliberately plain links (no client JS): these pages are prerendered and the
 * links double as the crawl path Google follows to reach ranks past the first
 * page — which is also why the current page is a <span aria-current>, not a
 * self-link, and why every other page is a real <a href> rather than a
 * scripted handler.
 */
export function RankingPagination({ page, pages, hrefFor, label }: Props) {
  if (pages <= 1) return null;

  const numbers = pageWindow(page, pages);

  return (
    <nav aria-label={label} className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link
          href={hrefFor(page - 1)}
          rel="prev"
          className="rounded-lg border border-border-default bg-background-elevated px-3 py-1.5 text-sm text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
        >
          ← Previous
        </Link>
      )}

      {numbers.map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-text-muted">
            …
          </span>
        ) : n === page ? (
          <span
            key={n}
            aria-current="page"
            className="rounded-lg border border-accent-cyan/60 bg-background-elevated px-3 py-1.5 text-sm font-semibold tabular-nums text-accent-cyan"
          >
            {n}
          </span>
        ) : (
          <Link
            key={n}
            href={hrefFor(n)}
            className="rounded-lg border border-border-default bg-background-elevated px-3 py-1.5 text-sm tabular-nums text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
          >
            {n}
          </Link>
        ),
      )}

      {page < pages && (
        <Link
          href={hrefFor(page + 1)}
          rel="next"
          className="rounded-lg border border-border-default bg-background-elevated px-3 py-1.5 text-sm text-text-primary transition-colors hover:border-accent-cyan/60 hover:text-accent-cyan"
        >
          Next →
        </Link>
      )}
    </nav>
  );
}

/**
 * Page numbers to render: always the first and last page, plus a window around
 * the current one, with `null` marking an elided run. Exported for tests.
 */
export function pageWindow(page: number, pages: number, radius = 1): Array<number | null> {
  const wanted = new Set<number>([1, pages]);
  for (let n = page - radius; n <= page + radius; n++) {
    if (n >= 1 && n <= pages) wanted.add(n);
  }
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: Array<number | null> = [];
  let previous = 0;
  for (const n of sorted) {
    // Only elide a real gap; a single skipped page is shown instead of "…"
    // (same width, more useful).
    if (previous > 0 && n - previous > 1) {
      if (n - previous === 2) out.push(previous + 1);
      else out.push(null);
    }
    out.push(n);
    previous = n;
  }
  return out;
}
