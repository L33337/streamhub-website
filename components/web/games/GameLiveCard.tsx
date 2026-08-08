import { SlotCard } from '@/components/web/SlotCard';
import type { GameLiveCardSlot } from '@/lib/game-live';

/**
 * One card of the game hub's "Watching {category} now" grid.
 *
 * Deliberately NOT a client component: the section's head renders on the server
 * and only the tail is rendered by the filter island, so this file has to
 * compile into both graphs (the same reason `LiveRailCard` and `TonightLiveRow`
 * carry no `'use client'`).
 *
 * The `data-game-live-id` marker is how the island toggles the SERVER-rendered
 * cards, and `data-game-live-deferred` is how it tells them apart from its own:
 * React owns the deferred nodes, so the imperative pass must never touch them
 * or one node would have two owners.
 */
export function GameLiveCard({
  slot,
  locale,
  hidden = false,
  deferred = false,
}: {
  slot: GameLiveCardSlot;
  locale: string;
  /** Past the resting cut the server hides the card outright, so the island's
   *  first pass agrees with the served HTML and nothing shifts on hydration. */
  hidden?: boolean;
  deferred?: boolean;
}) {
  return (
    <li
      data-game-live-id={slot.id}
      data-game-live-deferred={deferred ? '' : undefined}
      hidden={hidden || undefined}
    >
      <SlotCard slot={slot} language={locale} />
    </li>
  );
}
