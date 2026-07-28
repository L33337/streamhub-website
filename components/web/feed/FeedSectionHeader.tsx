import Link from 'next/link';

export function FeedSectionHeader({
  title,
  count,
  live,
  actionLabel,
  actionHref,
}: {
  title: string;
  /** Glanceable item count rendered as "· N" after the title. */
  count?: number;
  /** Pulsing live dot before the title (Live Now section). */
  live?: boolean;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    // Wrapping matters on narrow viewports: with a long title (the live rail's
    // "Biggest live right now") and a long action label the two used to
    // overlap at 390 px. The title/count/dot are laid out as inline text
    // rather than as flex items, so "· 10" follows the last wrapped word
    // instead of floating beside a two-line heading.
    <div className="mt-8 mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="min-w-0 text-xl font-bold text-white">
        {live && (
          <span
            aria-hidden="true"
            className="relative mr-2 inline-flex h-2.5 w-2.5 align-middle"
          >
            <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-live" />
          </span>
        )}
        {title}
        {typeof count === 'number' && (
          <span className="ml-2 text-sm font-semibold text-text-muted">· {count}</span>
        )}
      </h2>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="text-sm font-semibold text-accent-cyan hover:underline"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
