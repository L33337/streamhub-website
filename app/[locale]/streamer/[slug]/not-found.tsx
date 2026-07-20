import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-sm uppercase tracking-widest text-text-muted">404</p>
      <h1 className="mt-4 text-4xl font-bold text-white">Streamer not found</h1>
      <p className="mt-4 text-text-secondary">
        We couldn&apos;t find a streamer with that name. They may not be on
        Streamer Times yet — but you can add them in the mobile app.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-2 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
        >
          Browse streamers
        </Link>
        <Link
          href="/app?from=add"
          className="inline-flex items-center rounded-lg border border-border-default bg-background-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent-cyan/40 transition-colors"
        >
          Get the app
        </Link>
      </div>
    </main>
  );
}
