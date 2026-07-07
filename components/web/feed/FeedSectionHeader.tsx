import Link from 'next/link';

export function FeedSectionHeader({
  title,
  actionLabel,
  actionHref,
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="mt-8 mb-3 flex items-baseline justify-between">
      <h2 className="text-xl font-bold text-white">{title}</h2>
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
