import { chromeLexFor } from '@/lib/i18n-chrome';
import { hubLexFor } from '@/lib/i18n-hub';
import type { UiLang } from '@/lib/i18n-core';

const APP_STORE_URL = 'https://apps.apple.com/app/id6760627630';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.streamhub.tv.app';

/**
 * The two store badges of the homepage end-cap (extracted from the former
 * HomeHero during the 2026-07-27 rebuild; the masthead dropped them again in
 * the same round, so HomeEndCap is the only caller today).
 * Server component — resolves its own lexica.
 *
 * Layout (2026-07-31): a 2-column grid on phones so the badges never stack —
 * they share the full card width there, and `.store-badge` scales its box with
 * the viewport (globals.css) so even a 320px screen fits both. From `sm` up the
 * grid gives way to the original auto-width flex row.
 */
export function StoreBadges({
  locale = 'en',
  className = '',
}: {
  locale?: UiLang;
  className?: string;
}) {
  const L = hubLexFor(locale);
  const chrome = chromeLexFor(locale);

  return (
    <div
      className={`grid max-w-[26rem] grid-cols-2 gap-1.5 sm:flex sm:max-w-none sm:flex-wrap sm:gap-2 ${className}`}
    >
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="store-badge"
        aria-label={chrome.footer.appStoreAria}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
        <span className="store-badge-stack">
          <span className="store-badge-sub">{L.hero.appStoreSub}</span>
          <span className="store-badge-main">App Store</span>
        </span>
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="store-badge"
        aria-label={chrome.footer.playStoreAria}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M3.61 1.814 13.793 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734c0-.384.22-.72.61-.92zM14.5 12.707l2.55 2.55-8.37 4.78L14.5 12.707zM19.41 11.1l-2.2 1.26L14.5 12l2.71-.36 2.2-1.26c.5-.28.5-.72 0-1L17.21 8.12 14.5 12l2.71.36 2.2 1.26c.22.12.22.26 0 .38zM8.68 3.963l8.37 4.78L14.5 11.293 8.68 3.963z" />
        </svg>
        <span className="store-badge-stack">
          <span className="store-badge-sub">{L.hero.playSub}</span>
          <span className="store-badge-main">Google Play</span>
        </span>
      </a>
    </div>
  );
}
