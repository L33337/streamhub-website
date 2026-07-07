'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { useFavorites } from '@/hooks/useFavorites';

type Size = 'sm' | 'md';

interface Props {
  streamerId: string;
  streamerName?: string;
  size?: Size;
  className?: string;
  /** Fires after the toggle resolves (M16: feed interaction logging). */
  onToggled?: (nowFavorited: boolean) => void;
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
}: Props) {
  const { user } = useAuth();
  const { isFavorited, toggle } = useFavorites();
  const router = useRouter();
  const sizeClasses = SIZE_CLASSES[size];

  const label = streamerName
    ? `Favorite ${streamerName}`
    : 'Favorite streamer';

  // Anonymous users get a button that points to the mobile app, where
  // favoriting actually works. Sign-in UI on the website is dormant while
  // auth is hidden — point to /app instead of /auth/login. Must be a <button>
  // (not <Link>) because this component is often rendered inside a card-wide
  // <Link>, and nested <a> elements are invalid HTML.
  if (!user) {
    return (
      <button
        type="button"
        aria-label={`Save ${streamerName ?? 'streamer'} in the app`}
        title="Save in the app"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push('/app?from=favorite');
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
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
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
