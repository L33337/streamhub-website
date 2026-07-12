import Link from 'next/link';

// Global 404 — also the catch-all for unmatched routes. Kept fully static
// (synchronous, no data fetch, no cookies()/headers()) so it renders inside the
// static root layout without opting the route tree into dynamic rendering.
export default function NotFound() {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-sm uppercase tracking-widest text-text-muted">404</p>
      <h1 className="mt-4 text-4xl font-bold text-white">Page not found</h1>
      <p className="mt-4 text-text-secondary">
        We couldn&apos;t find that page. It may have moved, or the link may be
        broken. Try one of these instead:
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
        >
          Home
        </Link>
        <Link
          href="/live"
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          Who&apos;s live now
        </Link>
        <Link
          href="/streamers"
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          Browse streamers
        </Link>
        <Link
          href="/games"
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          Games
        </Link>
        <Link
          href="/app"
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          Get the app
        </Link>
      </div>
    </main>
  );
}
