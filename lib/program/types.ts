// Program page types (app Program-tab port) — see lib/program/logic.ts for
// the derivation pipeline. All grouping is in the VIEWER's local timezone,
// which is why ProgramDay is only ever built client-side after mount.

import type { StreamSlot } from '@/lib/feed/types';
import type { FavoriteStreamerRow } from '@/lib/supabase/favorites';

export interface ProgramSection {
  /** 'live' | 'hour-<n>' — also the scroll-anchor suffix (id="program-<id>"). */
  id: string;
  /** 'Live Now' | hour label ('4pm', '12am', …). */
  title: string;
  type: 'live' | 'upcoming';
  /** Local start hour for upcoming sections; null for the live section. */
  hour: number | null;
  slots: StreamSlot[];
}

export interface ProgramDay {
  sections: ProgramSection[];
  /** "Missed": real slots that already ended today, within the last 6 h. */
  missedSlots: StreamSlot[];
  /** "Offline today": favorites with no slot on the actual current day. */
  offlineFavorites: FavoriteStreamerRow[];
}
