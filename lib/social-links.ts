/**
 * Streamer Times' own social profiles (2026-09-26, M27 rollout).
 *
 * ONE place for the URLs: the footer renders them as icon links and the
 * site-wide JSON-LD (SoftwareApplication in the locale layout, WebSite on the
 * homepage) lists them as `sameAs`, which is what ties the website, the store
 * listings and the social accounts into one entity for Google. Keep the
 * reverse direction in mind too: each profile's website field must point at
 * https://streamertimes.tv, or the entity link is one-sided.
 *
 * Plain links only — never embeds or platform widgets. Those load third-party
 * scripts, set cookies and would widen the consent banner; four <a> tags cost
 * nothing.
 *
 * An entry with an empty `url` is not rendered anywhere (no dead footer links,
 * no bogus sameAs), so a platform can be parked here before its account is
 * live. The vitest suite validates every configured URL (https, host matches
 * the platform, no trailing slash).
 */

export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'x' | 'facebook';

export interface SocialLink {
  platform: SocialPlatform;
  /** Human label — also the aria-label/title of the icon link (brand names are not translated). */
  label: string;
  /** Canonical profile URL, or '' while the account does not exist yet. */
  url: string;
}

/** Display order = footer order. */
const CONFIGURED: readonly SocialLink[] = [
  { platform: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/streamer_times' },
  { platform: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@streamer_times_stt' },
  { platform: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@Streamer_Times' },
  { platform: 'x', label: 'X', url: 'https://x.com/Streamer_Times' },
  // Facebook page without a vanity name: profile.php?id= IS the canonical URL.
  { platform: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61594930374806' },
];

/** Only the profiles that exist — what the footer and the JSON-LD use. */
export const SOCIAL_LINKS: readonly SocialLink[] = CONFIGURED.filter((l) => l.url !== '');

/** schema.org `sameAs` value for the organisation-level JSON-LD blocks. */
export function socialSameAs(): string[] {
  return SOCIAL_LINKS.map((l) => l.url);
}

/** Hostnames a platform's profile URL may live on (test contract). */
export const SOCIAL_HOSTS: Record<SocialPlatform, readonly string[]> = {
  instagram: ['instagram.com', 'www.instagram.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com'],
  youtube: ['youtube.com', 'www.youtube.com'],
  x: ['x.com', 'twitter.com'],
  facebook: ['facebook.com', 'www.facebook.com'],
};
