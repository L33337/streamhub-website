import Link from 'next/link';
import type { Platform } from '@/lib/server/partner-api';

interface Props {
  q: string;
  platform: Platform | null;
  live: boolean;
}

function buildSearchHref(
  q: string,
  overrides: { platform?: Platform | null; live?: boolean },
): string {
  const params = new URLSearchParams();
  params.set('q', q);
  if (overrides.platform) params.set('platform', overrides.platform);
  if (overrides.live) params.set('live', 'true');
  return `/search?${params.toString()}`;
}

function ChipLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const base =
    'inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors';
  const cls = active
    ? `${base} border-accent-cyan/60 bg-accent-cyan/15 text-accent-cyan`
    : `${base} border-border-default bg-background-elevated text-text-secondary hover:border-accent-cyan/40 hover:text-text-primary`;
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function SearchFilters({ q, platform, live }: Props) {
  return (
    <nav aria-label="Search filters" className="mt-4 flex flex-wrap items-center gap-2">
      <ChipLink href={buildSearchHref(q, { live })} active={platform === null}>
        All platforms
      </ChipLink>
      <ChipLink
        href={buildSearchHref(q, { platform: 'twitch', live })}
        active={platform === 'twitch'}
      >
        Twitch
      </ChipLink>
      <ChipLink
        href={buildSearchHref(q, { platform: 'youtube', live })}
        active={platform === 'youtube'}
      >
        YouTube
      </ChipLink>
      <span className="mx-1 h-5 w-px bg-divider" aria-hidden="true" />
      <ChipLink
        href={buildSearchHref(q, { platform, live: !live })}
        active={live}
      >
        {live ? 'Live only ✓' : 'Live only'}
      </ChipLink>
    </nav>
  );
}
