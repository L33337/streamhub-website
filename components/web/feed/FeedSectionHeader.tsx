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
    <div className="mt-8 mb-3 flex items-baseline justify-between">
      <h2 className="flex items-center gap-2 text-xl font-bold text-white">
        {live && (
          <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-live" />
          </span>
        )}
        {title}
        {typeof count === 'number' && (
          <span className="text-sm font-semibold text-text-muted">· {count}</span>
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
