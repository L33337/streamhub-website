'use client';

// Settings section listing the user's followed games (game-hub UX round
// 2026-07-23). The server page fetches the initial rows (RLS-scoped); removal
// is optimistic through the browser client. Renders nothing while the user
// follows no games — an empty settings box would just be noise.

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { createSupabaseBrowserClient } from '@/lib/supabase/client-eager';
import { unfollowGame } from '@/lib/supabase/gameFollows';

export interface FollowedGameItem {
  category: string;
  slug: string;
}

export function FollowedGamesSection({ initial }: { initial: FollowedGameItem[] }) {
  const [items, setItems] = useState(initial);

  if (items.length === 0) return null;

  const remove = async (category: string) => {
    const prev = items;
    setItems(prev.filter((i) => i.category !== category)); // optimistic
    try {
      await unfollowGame(createSupabaseBrowserClient(), category);
    } catch (err) {
      console.warn('[FollowedGamesSection] unfollow failed:', err);
      setItems(prev); // revert
    }
  };

  return (
    <SettingsSection title="Followed games">
      <p className="text-sm text-text-secondary">
        Games you follow from their hub pages.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Followed games">
        {items.map((item) => (
          <li
            key={item.category}
            className="inline-flex items-center gap-1 rounded-full border border-border-default bg-background-elevated pl-3 pr-1 py-1 text-sm"
          >
            {item.slug ? (
              <Link
                href={`/game/${item.slug}`}
                className="text-text-primary hover:text-accent-cyan"
              >
                {item.category}
              </Link>
            ) : (
              <span className="text-text-primary">{item.category}</span>
            )}
            <button
              type="button"
              onClick={() => remove(item.category)}
              aria-label={`Unfollow ${item.category}`}
              title="Unfollow"
              className="flex h-5 w-5 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-background-highlight hover:text-accent-pink"
            >
              <X size={12} />
            </button>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
