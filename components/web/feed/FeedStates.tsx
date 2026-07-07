'use client';

import Link from 'next/link';

/** Per-section failure row with a Retry action (never kills the feed). */
export function SectionErrorRow({
  label,
  onRetry,
}: {
  label: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between rounded-xl border border-border-default bg-background-elevated px-4 py-3">
      <span className="text-sm text-text-muted">{label}</span>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-semibold text-accent-cyan hover:underline"
      >
        Retry
      </button>
    </div>
  );
}

/** Rendered when the user has no favorites yet. */
export function EmptyFavoritesCard() {
  return (
    <div className="mt-4 rounded-xl border border-border-default bg-background-elevated p-8 text-center">
      <h2 className="text-lg font-bold text-text-primary">No favorites yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
        Add streamers you follow and your feed fills up with their streams, VODs and highlights.
      </p>
      <Link
        href="/search"
        className="mt-4 inline-flex items-center rounded-full border border-accent-cyan px-5 py-2 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
      >
        Find streamers
      </Link>
    </div>
  );
}

/** Rendered when an active category chip filters every content section empty. */
export function EmptyFilterHint() {
  return (
    <div className="mt-6 rounded-xl border border-border-default bg-background-elevated p-8 text-center">
      <h2 className="text-lg font-bold text-text-primary">Nothing in this category</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
        None of the current feed items match this filter. Tap the chip again to clear it.
      </p>
    </div>
  );
}
