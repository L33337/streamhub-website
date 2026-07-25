'use client';

import { openConsentBanner } from '@/lib/consent';

/**
 * Footer entry that reopens the consent banner so a visitor can change or
 * withdraw their choice at any time (GDPR revocability). Styled to match the
 * surrounding footer links; it's a <button> because it triggers an in-page
 * action rather than navigating.
 */
export function ConsentSettingsLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={openConsentBanner}
      className="text-left text-sm text-text-secondary transition-colors hover:text-accent-cyan"
    >
      {label}
    </button>
  );
}
