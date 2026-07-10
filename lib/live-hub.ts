import type { PublicStreamSlot } from '@/lib/server/partner-api';

export interface LiveHubGroup {
  /** Canonical category name; null groups uncategorized streams ("Other"). */
  category: string | null;
  /** One slot per streamer, sorted by streamer name. */
  slots: PublicStreamSlot[];
}

/**
 * Groups live slots into the /live hub's per-category sections.
 *
 * - Dedupes by streamer_id (a multi-platform streamer can hold more than one
 *   live slot; the first slot wins — the API returns them in a stable order).
 * - Groups by trimmed category; empty/whitespace categories collapse to null.
 * - Groups sort by size desc, then category name asc; the null-category group
 *   always sorts last (it's the "Other" bucket, not a headline section).
 * - Slots within a group sort by streamer name (case-insensitive).
 *
 * Pure function — all fetch/render concerns live in app/live/page.tsx.
 */
export function groupLiveSlotsByCategory(slots: PublicStreamSlot[]): LiveHubGroup[] {
  const seen = new Set<string>();
  const byCategory = new Map<string | null, PublicStreamSlot[]>();

  for (const slot of slots) {
    if (seen.has(slot.streamer_id)) continue;
    seen.add(slot.streamer_id);
    const category = slot.category?.trim() || null;
    const bucket = byCategory.get(category) ?? [];
    bucket.push(slot);
    byCategory.set(category, bucket);
  }

  const groups: LiveHubGroup[] = [...byCategory.entries()].map(([category, group]) => ({
    category,
    slots: [...group].sort((a, b) =>
      a.streamer_name.toLowerCase().localeCompare(b.streamer_name.toLowerCase()),
    ),
  }));

  groups.sort((a, b) => {
    if ((a.category === null) !== (b.category === null)) return a.category === null ? 1 : -1;
    if (a.slots.length !== b.slots.length) return b.slots.length - a.slots.length;
    return (a.category ?? '').localeCompare(b.category ?? '');
  });

  return groups;
}
