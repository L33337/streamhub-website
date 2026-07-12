'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { useFavorites } from '@/hooks/useFavorites';
import { slotLexFor } from '@/lib/i18n-slot';
import { AUTH_ENABLED } from '@/lib/auth-flag';

type Size = 'sm' | 'md';

interface Props {
  streamerId: string;
  streamerName?: string;
  size?: Size;
  className?: string;
  /** Fires after the toggle resolves (M16: feed interaction logging). */
  onToggled?: (nowFavorited: boolean) => void;
  /** Localizes labels/titles on the streamer page; default 'en' keeps search/feed/favorites callers byte-identical. */
  language?: string;
}

const SIZE_CLASSES: Record<Size, { button: string; icon: number }> = {
  sm: { button: 'h-8 w-8', icon: 16 },
  md: { button: 'h-10 w-10', icon: 20 },
};

function HeartIcon({
  filled,
  size,
}: {
  filled: boolean;
  size: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function FavoriteButton({
  streamerId,
  streamerName,
  size = 'md',
  className = '',
  onToggled,
  language = 'en',
}: Props) {
  const { user } = useAuth();
  const { isFavorited, toggle } = useFavorites();
  const router = useRouter();
  const pathname = usePathname();
  const sizeClasses = SIZE_CLASSES[size];
  const L = slotLexFor(language);

  const label = L.favoriteAria(streamerName);

  // Signed-out users: with auth enabled the heart leads to sign-in (returning
  // here afterwards); while auth is dormant it points to the mobile app, where
  // favoriting actually works. Must be a <button> (not <Link>) because this
  // component is often rendered inside a card-wide <Link>, and nested <a>
  // elements are invalid HTML.
  if (!user) {
    const target = AUTH_ENABLED
      ? `/auth/login?next=${encodeURIComponent(pathname)}`
      : '/app?from=favorite';
    return (
      <button
        type="button"
        aria-label={
          AUTH_ENABLED
            ? L.signInToFavoriteAria(streamerName)
            : L.saveInAppAria(streamerName)
        }
        title={AUTH_ENABLED ? L.signInTitle : L.saveInAppTitle}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push(target);
        }}
        className={`inline-flex items-center justify-center rounded-full border border-border-default bg-background-elevated text-text-muted hover:border-accent-pink/40 hover:text-accent-pink transition-colors ${sizeClasses.button} ${className}`}
      >
        <HeartIcon filled={false} size={sizeClasses.icon} />
      </button>
    );
  }

  const favorited = isFavorited(streamerId);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={favorited}
      title={favorited ? L.removeFromFavorites : L.addToFavorites}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        const nowFavorited = !favorited;
        void toggle(streamerId).then(() => onToggled?.(nowFavorited));
      }}
      className={`inline-flex items-center justify-center rounded-full border transition-colors ${sizeClasses.button} ${className} ${
        favorited
          ? 'border-accent-pink/60 bg-accent-pink/15 text-accent-pink hover:bg-accent-pink/25'
          : 'border-border-default bg-background-elevated text-text-muted hover:border-accent-pink/40 hover:text-accent-pink'
      }`}
    >
      <HeartIcon filled={favorited} size={sizeClasses.icon} />
    </button>
  );
}
