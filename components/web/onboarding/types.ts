import type { Platform } from '@/lib/server/partner-api';

/** Lean, serializable streamer row for the onboarding pick step (derived from
 * Discover recommendations server-side and /api/search results client-side). */
export interface OnboardingSuggestion {
  id: string;
  name: string;
  avatarUrl: string | null;
  platforms: Platform[];
  isLive: boolean;
}
