import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-3xl font-bold gradient-text mb-3">Stream not found</h1>
      <p className="text-text-secondary mb-6">
        This stream slot doesn&apos;t exist or is no longer available.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-2 text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
      >
        ← Back to schedule
      </Link>
    </main>
  );
}
